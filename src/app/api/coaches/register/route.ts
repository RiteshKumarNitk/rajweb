import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import type { CertificationLevel } from "@prisma/client";

const coachSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  mobile: z.string().min(10).max(20),
  qualification: z.string().min(2).max(500),
  certificationLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "INTERNATIONAL"]),
  district: z.string().min(1).max(100),
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
    const data = coachSchema.parse(body);

    const authUser = await getCurrentUser();
    if (authUser) {
      const existing = await prisma.coach.findUnique({ where: { userId: authUser.id } });
      if (existing) {
        throw AppError.conflict("You already have a coach registration.");
      }
    }

    const districtId = await resolveDistrictId(data.district);

    const coach = await prisma.coach.create({
      data: {
        coachId: generateId("CCH"),
        name: sanitizeText(data.name),
        email: sanitizeEmail(data.email),
        mobile: sanitizePhone(data.mobile),
        qualification: sanitizeText(data.qualification),
        certificationLevel: data.certificationLevel as CertificationLevel,
        districtId,
        userId: authUser?.id,
        status: "PENDING",
      },
    });

    return jsonSuccess(
      { coachId: coach.coachId },
      requestId,
      "Coach registration submitted for approval"
    );
  },
  { module: "coaches", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
