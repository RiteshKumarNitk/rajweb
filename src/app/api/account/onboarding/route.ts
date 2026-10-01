import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { sanitizeText, sanitizeOptionalText, sanitizePhone } from "@/security/sanitize";
import { createAuditLog } from "@/services/audit/audit-service";
import { getMemberHome } from "@/modules/account/member-home.server";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  memberType: z.enum(["PLAYER", "COACH", "SUPPORTER"]),
  stateId: z.string().min(1, "Select your state"),
  districtId: z.string().min(1, "Select your district"),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
});

const NEXT_STEP: Record<string, string> = {
  PLAYER: "/account/player",
  COACH: "/account/coach",
  SUPPORTER: "/account/dashboard",
};

/**
 * One-time member onboarding: sets the member's home State/District. The
 * district must belong to the chosen state (400 otherwise). Once a home is
 * set — here or through a player/coach registration — it can only change via
 * a District Change request (409 here).
 */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const authUser = await requireAuth();
    const data = onboardingSchema.parse(await request.json());

    const home = await getMemberHome(authUser.id);
    if (home.onboarded) {
      throw AppError.conflict("Your district is already set. To move, raise a District Change request from your Player or Coach portal.");
    }

    const district = await prisma.district.findUnique({
      where: { id: data.districtId },
      select: { id: true, name: true, isActive: true, stateId: true, state: { select: { id: true, name: true, isActive: true } } },
    });
    if (!district || !district.isActive || !district.state?.isActive) {
      throw AppError.validation("Invalid district selected");
    }
    if (district.stateId !== data.stateId) {
      throw AppError.validation("The selected district does not belong to the selected state");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authUser.id },
        data: { name: sanitizeText(data.name), phone: sanitizePhone(data.phone) },
      }),
      prisma.userProfile.upsert({
        where: { userId: authUser.id },
        create: {
          userId: authUser.id,
          stateId: district.state.id,
          districtId: district.id,
          memberType: data.memberType,
          onboardedAt: new Date(),
          state: district.state.name,
          address: sanitizeOptionalText(data.address) ?? null,
          city: sanitizeOptionalText(data.city) ?? null,
          pincode: data.pincode || null,
        },
        update: {
          stateId: district.state.id,
          districtId: district.id,
          memberType: data.memberType,
          onboardedAt: new Date(),
          state: district.state.name,
          ...(data.address ? { address: sanitizeText(data.address) } : {}),
          ...(data.city ? { city: sanitizeText(data.city) } : {}),
          ...(data.pincode ? { pincode: data.pincode } : {}),
        },
      }),
    ]);

    await createAuditLog({
      userId: authUser.id,
      action: "UPDATE",
      module: "account",
      entityId: authUser.id,
      entityType: "UserProfile",
      details: { event: "MEMBER_ONBOARDED", memberType: data.memberType, stateId: district.state.id, districtId: district.id },
    });

    return jsonSuccess(
      { stateName: district.state.name, districtName: district.name, next: NEXT_STEP[data.memberType] },
      requestId,
      "Welcome! Your district is set."
    );
  },
  { module: "account-onboarding", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
