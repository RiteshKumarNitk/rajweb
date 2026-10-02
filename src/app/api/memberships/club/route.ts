import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { resolveRegistrationDistrict } from "@/modules/districts/registration-locations.server";
import { withRegistrationChoice } from "@/modules/applications/registration-choice.server";

const clubSchema = z.object({
  clubName: z.string().min(2).max(200),
  contactPerson: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  address: z.string().min(10).max(500),
  courts: z.coerce.number().int().positive().max(100),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = clubSchema.parse(body);

    const authUser = await getCurrentUser();
    if (authUser) {
      const existing = await prisma.clubMembership.findUnique({ where: { userId: authUser.id } });
      if (existing) {
        throw AppError.conflict("You already have a club membership application.");
      }
    }

    // Owning state is decided by the district, resolved server-side within the submitted state.
    const { districtId } = await resolveRegistrationDistrict({ district: data.district, state: data.state });

    const record = {
      membershipId: generateId("CLB"),
      clubName: sanitizeText(data.clubName),
      contactPerson: sanitizeText(data.contactPerson),
      email: sanitizeEmail(data.email),
      mobile: sanitizePhone(data.phone),
      address: sanitizeText(data.address),
      districtId,
      userId: authUser?.id,
      numberOfCourts: data.courts,
      status: "PENDING" as const,
    };
    // Signed-in applicants: one registration per account (Player, Coach or Membership).
    const membership = authUser?.id
      ? await withRegistrationChoice(authUser.id, "membership", (tx) => tx.clubMembership.create({ data: record }))
      : await prisma.clubMembership.create({ data: record });

    return jsonSuccess(
      { membershipId: membership.membershipId },
      requestId,
      "Club membership application submitted"
    );
  },
  { module: "memberships-club", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
