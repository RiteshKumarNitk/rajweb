import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import type { CertificationLevel } from "@prisma/client";

const log = createModuleLogger("coaches");

async function resolveDistrictId(districtName: string) {
  const district = await prisma.district.findFirst({
    where: { name: { equals: districtName, mode: "insensitive" } },
  });
  if (!district) throw AppError.validation("Invalid district selected");
  return district.id;
}

export async function approveCoach(coachId: string, approvedBy: string) {
  const result = await prisma.coach.updateMany({
    where: { id: coachId, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy, rejectionReason: null },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ coachId, approvedBy }, "Coach approved");
  return prisma.coach.findUniqueOrThrow({ where: { id: coachId } });
}

export async function rejectCoach(coachId: string, reason: string) {
  const result = await prisma.coach.updateMany({
    where: { id: coachId, status: "PENDING" },
    data: { status: "REJECTED", rejectionReason: reason },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ coachId }, "Coach rejected");
  return prisma.coach.findUniqueOrThrow({ where: { id: coachId } });
}

export interface ResubmitCoachInput {
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  certificationLevel: CertificationLevel;
  district: string;
}

export async function resubmitCoach(coachId: string, input: ResubmitCoachInput) {
  const districtId = await resolveDistrictId(input.district);

  const result = await prisma.coach.updateMany({
    where: { id: coachId, status: "REJECTED" },
    data: {
      name: sanitizeText(input.name),
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.mobile),
      qualification: sanitizeText(input.qualification),
      certificationLevel: input.certificationLevel,
      districtId,
      status: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
  }
  log.info({ coachId }, "Coach application resubmitted");
  return prisma.coach.findUniqueOrThrow({ where: { id: coachId } });
}
