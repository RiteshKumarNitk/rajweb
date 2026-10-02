import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { resolveRegistrationDistrict } from "@/modules/districts/registration-locations.server";
import { withRegistrationChoice } from "@/modules/applications/registration-choice.server";

const schoolSchema = z.object({
  schoolName: z.string().min(2).max(200),
  principalName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  address: z.string().min(10).max(500),
  studentCount: z.coerce.number().int().positive().max(100000).optional(),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = schoolSchema.parse(body);

    const authUser = await getCurrentUser();
    if (authUser) {
      const existing = await prisma.schoolMembership.findUnique({ where: { userId: authUser.id } });
      if (existing) {
        throw AppError.conflict("You already have a school membership application.");
      }
    }

    // Owning state is decided by the district, resolved server-side within the submitted state.
    const { districtId } = await resolveRegistrationDistrict({ district: data.district, state: data.state });

    const record = {
      membershipId: generateId("SCH"),
      schoolName: sanitizeText(data.schoolName),
      principalName: sanitizeText(data.principalName),
      email: sanitizeEmail(data.email),
      mobile: sanitizePhone(data.phone),
      address: sanitizeText(data.address),
      districtId,
      userId: authUser?.id,
      studentCount: data.studentCount,
      status: "PENDING" as const,
    };
    // Signed-in applicants: one registration per account (Player, Coach or Membership).
    const membership = authUser?.id
      ? await withRegistrationChoice(authUser.id, "membership", (tx) => tx.schoolMembership.create({ data: record }))
      : await prisma.schoolMembership.create({ data: record });

    return jsonSuccess(
      { membershipId: membership.membershipId },
      requestId,
      "School membership application submitted"
    );
  },
  { module: "memberships-school", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
