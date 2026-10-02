import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import type { Gender } from "@prisma/client";
import { resolveApplicationDistrict } from "@/modules/districts/registration-locations.server";
import { duplicateApplicationError } from "@/modules/applications/duplicate-application";
import { withRegistrationChoice } from "@/modules/applications/registration-choice.server";
import {
  resolveGovernmentId,
  scopeGovernmentIdDocument,
  type GovernmentIdInput,
} from "@/modules/applications/government-id";

const log = createModuleLogger("players");

export interface RegisterPlayerInput extends GovernmentIdInput {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  mobile: string;
  /** Account forms send ids (validated: the district must be in the state); public forms send names. */
  stateId?: string;
  districtId?: string;
  district?: string;
  /** State slug/id chosen on the form; required only when the district name is ambiguous. */
  state?: string;
  category?: string;
  /** Set only when the submitter is a logged-in user — links the record to their account. */
  userId?: string;
}

/**
 * Account applications (userId set) run under the one-registration rule and
 * must carry a Government ID; public submissions (no account) do not.
 */
export async function registerPlayer(input: RegisterPlayerInput) {
  const { districtId, stateId } = await resolveApplicationDistrict(input);
  const data = {
    playerId: generateId("PLR"),
    name: sanitizeText(input.name),
    dateOfBirth: new Date(input.dateOfBirth),
    gender: input.gender,
    email: sanitizeEmail(input.email),
    mobile: sanitizePhone(input.mobile),
    districtId,
    category: input.category ? sanitizeText(input.category) : undefined,
    status: "PENDING" as const,
  };

  const userId = input.userId;
  const player = userId
    ? await withRegistrationChoice(userId, "player", async (tx) => {
        const existing = await tx.player.findUnique({ where: { userId }, select: { status: true } });
        if (existing) throw duplicateApplicationError("player", existing.status);
        const governmentId = await resolveGovernmentId(tx, input, { userId });
        const created = await tx.player.create({ data: { ...data, ...governmentId, userId } });
        await scopeGovernmentIdDocument(tx, governmentId.governmentIdDocumentId, { stateId, districtId });
        return created;
      })
    : await prisma.player.create({ data });

  log.info({ playerId: player.playerId, districtId, userId: input.userId }, "Player registration submitted");
  return player;
}

export async function approvePlayer(playerId: string, approvedBy: string) {
  // updateMany + count check instead of update() — only mutates a row still
  // PENDING, so two concurrent admin actions on the same application can't
  // both succeed (the loser sees count 0 and reports a conflict).
  const result = await prisma.player.updateMany({
    where: { id: playerId, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy, rejectionReason: null },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ playerId, approvedBy }, "Player approved");
  return prisma.player.findUniqueOrThrow({ where: { id: playerId } });
}

export interface ResubmitPlayerInput extends GovernmentIdInput {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  mobile: string;
  stateId?: string;
  districtId?: string;
  district?: string;
  state?: string;
  category?: string;
}

/**
 * Corrects and resubmits a REJECTED player application in place — same
 * playerId, same userId, no new row. The concurrency guard also re-checks
 * status === REJECTED (not just id), so a resubmission racing an admin
 * decision on the same record loses cleanly with a conflict instead of
 * reviving an already-approved application.
 */
export async function resubmitPlayer(playerId: string, userId: string, input: ResubmitPlayerInput) {
  const { districtId, stateId } = await resolveApplicationDistrict(input);

  await withRegistrationChoice(userId, "player", async (tx) => {
    const existing = await tx.player.findUnique({
      where: { id: playerId },
      select: { governmentIdType: true, governmentIdNumber: true, governmentIdDocumentId: true },
    });
    // The number or document may be kept from the returned application.
    const governmentId = await resolveGovernmentId(tx, input, { userId, existing });

    const result = await tx.player.updateMany({
      where: { id: playerId, userId, status: "REJECTED" },
      data: {
        name: sanitizeText(input.name),
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender,
        email: sanitizeEmail(input.email),
        mobile: sanitizePhone(input.mobile),
        districtId,
        category: input.category ? sanitizeText(input.category) : null,
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
  log.info({ playerId }, "Player application resubmitted");
  return prisma.player.findUniqueOrThrow({ where: { id: playerId } });
}

export async function rejectPlayer(playerId: string, reason: string) {
  const result = await prisma.player.updateMany({
    where: { id: playerId, status: "PENDING" },
    data: { status: "REJECTED", rejectionReason: reason },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ playerId }, "Player rejected");
  return prisma.player.findUniqueOrThrow({ where: { id: playerId } });
}
