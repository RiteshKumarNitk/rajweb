import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import type { CertificationLevel } from "@prisma/client";
import { resolveApplicationDistrict } from "@/modules/districts/registration-locations.server";
import { withRegistrationChoice } from "@/modules/applications/registration-choice.server";
import {
  resolveGovernmentId,
  scopeGovernmentIdDocument,
  type GovernmentIdInput,
} from "@/modules/applications/government-id";

const log = createModuleLogger("coaches");

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

export interface ResubmitCoachInput extends GovernmentIdInput {
  name: string;
  email: string;
  mobile: string;
  qualification: string;
  certificationLevel: CertificationLevel;
  stateId?: string;
  districtId?: string;
  district?: string;
  state?: string;
}

export async function resubmitCoach(coachId: string, userId: string, input: ResubmitCoachInput) {
  const { districtId, stateId } = await resolveApplicationDistrict(input);

  await withRegistrationChoice(userId, "coach", async (tx) => {
    const existing = await tx.coach.findUnique({
      where: { id: coachId },
      select: { governmentIdType: true, governmentIdNumber: true, governmentIdDocumentId: true },
    });
    // The number or document may be kept from the returned application.
    const governmentId = await resolveGovernmentId(tx, input, { userId, existing });

    const result = await tx.coach.updateMany({
      where: { id: coachId, userId, status: "REJECTED" },
      data: {
        name: sanitizeText(input.name),
        email: sanitizeEmail(input.email),
        mobile: sanitizePhone(input.mobile),
        qualification: sanitizeText(input.qualification),
        certificationLevel: input.certificationLevel,
        districtId,
        ...governmentId,
        status: "PENDING",
        rejectionReason: null,
        approvedAt: null,
        approvedBy: null,
      },
    });
    if (result.count === 0) {
      throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
    }
    await scopeGovernmentIdDocument(tx, governmentId.governmentIdDocumentId, { stateId, districtId });
    // A replaced document is not kept.
    if (existing?.governmentIdDocumentId && existing.governmentIdDocumentId !== governmentId.governmentIdDocumentId) {
      await tx.mediaAsset.delete({ where: { id: existing.governmentIdDocumentId } });
    }
  });
  log.info({ coachId }, "Coach application resubmitted");
  return prisma.coach.findUniqueOrThrow({ where: { id: coachId } });
}
