import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { sanitizeText, sanitizeOptionalText, sanitizePhone } from "@/security/sanitize";
import { calculateProfileCompletion } from "@/modules/account/profile-completion";

async function loadUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export const GET = withApiHandler(
  async (_request, { requestId }) => {
    const authUser = await requireAuth();
    const user = await loadUserWithProfile(authUser.id);

    const completion = calculateProfileCompletion({
      name: user?.name ?? "",
      phone: user?.phone,
      profile: user?.profile,
    });

    return jsonSuccess(
      {
        name: user?.name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? null,
        dateOfBirth: user?.profile?.dateOfBirth ?? null,
        gender: user?.profile?.gender ?? null,
        address: user?.profile?.address ?? null,
        city: user?.profile?.city ?? null,
        state: user?.profile?.state ?? null,
        country: user?.profile?.country ?? "India",
        pincode: user?.profile?.pincode ?? null,
        completion,
      },
      requestId
    );
  },
  { module: "account-profile" }
);

// Deliberately excludes id/userId/email — the row to update is always the
// authenticated session's own user, never anything the client can name.
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.string().date().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().max(300).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
});

export const PATCH = withApiHandler(
  async (request, { requestId }) => {
    const authUser = await requireAuth();
    const data = updateProfileSchema.parse(await request.json());

    if (data.name || data.phone !== undefined) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: {
          ...(data.name ? { name: sanitizeText(data.name) } : {}),
          ...(data.phone !== undefined ? { phone: data.phone ? sanitizePhone(data.phone) : null } : {}),
        },
      });
    }

    const profileData = {
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : data.dateOfBirth === "" ? null : undefined,
      gender: data.gender,
      address: sanitizeOptionalText(data.address) ?? (data.address === "" ? null : undefined),
      city: sanitizeOptionalText(data.city) ?? (data.city === "" ? null : undefined),
      state: sanitizeOptionalText(data.state) ?? (data.state === "" ? null : undefined),
      country: sanitizeOptionalText(data.country) ?? (data.country === "" ? null : undefined),
      pincode: data.pincode ? data.pincode.trim() : data.pincode === "" ? null : undefined,
    };

    await prisma.userProfile.upsert({
      where: { userId: authUser.id },
      create: { userId: authUser.id, ...profileData },
      update: profileData,
    });

    const user = await loadUserWithProfile(authUser.id);
    const completion = calculateProfileCompletion({
      name: user?.name ?? "",
      phone: user?.phone,
      profile: user?.profile,
    });

    return jsonSuccess({ completion }, requestId, "Profile updated successfully");
  },
  { module: "account-profile", requireCsrf: true }
);
