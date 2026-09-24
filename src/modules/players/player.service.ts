import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import type { Gender } from "@prisma/client";

const log = createModuleLogger("players");

export interface RegisterPlayerInput {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  mobile: string;
  district: string;
  category?: string;
  /** Set only when the submitter is a logged-in user — links the record to their account. */
  userId?: string;
}

async function resolveDistrictId(districtName: string) {
  const district = await prisma.district.findFirst({
    where: { name: { equals: districtName, mode: "insensitive" } },
  });

  if (!district) {
    throw AppError.validation("Invalid district selected");
  }

  return district.id;
}

export async function registerPlayer(input: RegisterPlayerInput) {
  if (input.userId) {
    const existing = await prisma.player.findUnique({ where: { userId: input.userId } });
    if (existing) {
      throw AppError.conflict("You already have a player registration.");
    }
  }

  const districtId = await resolveDistrictId(input.district);

  const player = await prisma.player.create({
    data: {
      playerId: generateId("PLR"),
      name: sanitizeText(input.name),
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.mobile),
      districtId,
      userId: input.userId,
      category: input.category ? sanitizeText(input.category) : undefined,
      status: "PENDING",
    },
  });

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

export interface ResubmitPlayerInput {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  email: string;
  mobile: string;
  district: string;
  category?: string;
}

/**
 * Corrects and resubmits a REJECTED player application in place — same
 * playerId, same userId, no new row. The concurrency guard also re-checks
 * status === REJECTED (not just id), so a resubmission racing an admin
 * decision on the same record loses cleanly with a conflict instead of
 * reviving an already-approved application.
 */
export async function resubmitPlayer(playerId: string, input: ResubmitPlayerInput) {
  const districtId = await resolveDistrictId(input.district);

  const result = await prisma.player.updateMany({
    where: { id: playerId, status: "REJECTED" },
    data: {
      name: sanitizeText(input.name),
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender,
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.mobile),
      districtId,
      category: input.category ? sanitizeText(input.category) : null,
      status: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
  }
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
