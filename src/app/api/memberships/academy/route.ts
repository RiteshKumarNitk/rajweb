import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";

const academySchema = z.object({
  academyName: z.string().min(2).max(200),
  directorName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  address: z.string().min(10).max(500),
  coachCount: z.coerce.number().int().positive().max(1000).optional(),
});

async function resolveDistrictId(districtName: string) {
  const district = await prisma.district.findFirst({
    where: { name: { equals: districtName, mode: "insensitive" } },
  });
  if (!district) throw AppError.validation("Invalid district selected");
  return district.id;
}

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = academySchema.parse(body);

    const authUser = await getCurrentUser();
    if (authUser) {
      const existing = await prisma.academyMembership.findUnique({ where: { userId: authUser.id } });
      if (existing) {
        throw AppError.conflict("You already have an academy membership application.");
      }
    }

    const districtId = await resolveDistrictId(data.district);

    const membership = await prisma.academyMembership.create({
      data: {
        membershipId: generateId("ACD"),
        academyName: sanitizeText(data.academyName),
        directorName: sanitizeText(data.directorName),
        email: sanitizeEmail(data.email),
        mobile: sanitizePhone(data.phone),
        address: sanitizeText(data.address),
        districtId,
        userId: authUser?.id,
        coachCount: data.coachCount,
        status: "PENDING",
      },
    });

    return jsonSuccess(
      { membershipId: membership.membershipId },
      requestId,
      "Academy membership application submitted"
    );
  },
  { module: "memberships-academy", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
