import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import { REQUEST_TYPE_LABELS, type RequestTypeValue } from "@/modules/requests/request-types";
import { resolveRegistrationDistrict } from "@/modules/districts/registration-locations.server";

const log = createModuleLogger("requests");

export interface CreateRequestInput {
  userId: string;
  playerId?: string;
  coachId?: string;
  type: RequestTypeValue;
  reason: string;
  currentValue?: string;
  requestedValue?: string;
  requestedMobile?: string;
  requestedEmail?: string;
  requestedAddress?: string;
  requestedDistrictName?: string;
}

/** The state that currently owns the Player/Coach a request is attached to. */
async function currentOwnerStateId(input: { playerId?: string; coachId?: string }): Promise<string | null> {
  const owner = input.playerId
    ? await prisma.player.findUnique({ where: { id: input.playerId }, select: { district: { select: { stateId: true } } } })
    : input.coachId
      ? await prisma.coach.findUnique({ where: { id: input.coachId }, select: { district: { select: { stateId: true } } } })
      : null;
  return owner?.district?.stateId ?? null;
}

export async function createRequest(input: CreateRequestInput) {
  if (!input.playerId && !input.coachId) {
    throw AppError.badRequest("A request must be linked to your Player or Coach registration");
  }
  if (input.playerId && input.coachId) {
    throw AppError.badRequest("A request must target either your Player or Coach registration, not both");
  }

  // Duplicate-active-request protection: one PENDING request per type per
  // profile at a time — not a blanket "one request ever" rule.
  const existing = await prisma.request.findFirst({
    where: {
      status: "PENDING",
      type: input.type,
      ...(input.playerId ? { playerId: input.playerId } : { coachId: input.coachId }),
    },
  });
  if (existing) {
    throw AppError.conflict(`You already have a pending ${REQUEST_TYPE_LABELS[input.type]} request.`);
  }

  // Auto-apply types must carry the value they apply, otherwise approval
  // would be recorded while silently changing nothing.
  if (input.type === "CONTACT_UPDATE" && !input.requestedMobile && !input.requestedEmail) {
    throw AppError.validation("Enter the new mobile number or email address");
  }
  if (input.type === "ADDRESS_UPDATE" && !input.requestedAddress?.trim()) {
    throw AppError.validation("Enter the new address");
  }

  let requestedDistrictId: string | undefined;
  if (input.type === "DISTRICT_CHANGE") {
    if (!input.requestedDistrictName) throw AppError.validation("Select the district you want to move to");
    // Moves stay inside the member's current state: a cross-state transfer
    // would hand the record to another state's administration, which one
    // state's approval cannot authorise.
    const ownerStateId = await currentOwnerStateId(input);
    if (!ownerStateId) {
      throw AppError.validation("Your registration is not linked to a state yet. Contact RRA administration.");
    }
    ({ districtId: requestedDistrictId } = await resolveRegistrationDistrict({
      district: input.requestedDistrictName,
      withinStateId: ownerStateId,
    }));
  }

  const request = await prisma.request.create({
    data: {
      requestNumber: generateId("REQ"),
      userId: input.userId,
      playerId: input.playerId,
      coachId: input.coachId,
      type: input.type,
      reason: sanitizeText(input.reason),
      currentValue: input.currentValue ? sanitizeText(input.currentValue) : undefined,
      requestedValue: input.requestedValue ? sanitizeText(input.requestedValue) : undefined,
      requestedMobile: input.requestedMobile ? sanitizePhone(input.requestedMobile) : undefined,
      requestedEmail: input.requestedEmail ? sanitizeEmail(input.requestedEmail) : undefined,
      requestedAddress: input.requestedAddress ? sanitizeText(input.requestedAddress) : undefined,
      requestedDistrictId,
      status: "PENDING",
    },
  });

  log.info({ requestId: request.id, type: input.type, userId: input.userId }, "Request created");
  return request;
}

export async function approveRequest(requestId: string, adminId: string, adminRemarks?: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.request.findUnique({ where: { id: requestId } });
    if (!request) throw AppError.notFound("Request not found");

    const guard = await tx.request.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
        resolvedBy: adminId,
        adminRemarks: adminRemarks ? sanitizeText(adminRemarks) : null,
      },
    });
    if (guard.count === 0) {
      throw AppError.conflict("This request has already been processed.");
    }

    // Auto-apply only for the request types where the target field genuinely
    // exists and the change is unambiguous — see AUTO_APPLY_REQUEST_TYPES.
    // Everything else (profile corrections, certificate requests/corrections,
    // document updates, other) is informational-only: approval records the
    // decision but never guesses at a data mutation.
    switch (request.type) {
      case "CONTACT_UPDATE": {
        const data: { mobile?: string; email?: string } = {};
        if (request.requestedMobile) data.mobile = request.requestedMobile;
        if (request.requestedEmail) data.email = request.requestedEmail;
        if (Object.keys(data).length > 0) {
          if (request.playerId) await tx.player.update({ where: { id: request.playerId }, data });
          if (request.coachId) await tx.coach.update({ where: { id: request.coachId }, data });
        }
        break;
      }
      case "DISTRICT_CHANGE": {
        if (request.requestedDistrictId) {
          if (request.playerId) {
            await tx.player.update({ where: { id: request.playerId }, data: { districtId: request.requestedDistrictId } });
          }
          if (request.coachId) {
            await tx.coach.update({ where: { id: request.coachId }, data: { districtId: request.requestedDistrictId } });
          }
        }
        break;
      }
      case "ADDRESS_UPDATE": {
        if (request.requestedAddress) {
          await tx.userProfile.upsert({
            where: { userId: request.userId },
            update: { address: request.requestedAddress },
            create: { userId: request.userId, address: request.requestedAddress },
          });
        }
        break;
      }
      default:
        break;
    }

    log.info({ requestId, adminId, type: request.type }, "Request approved");
    return tx.request.findUniqueOrThrow({ where: { id: requestId } });
  });
}

export async function rejectRequest(requestId: string, adminId: string, reason: string) {
  const result = await prisma.request.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectionReason: sanitizeText(reason),
      resolvedAt: new Date(),
      resolvedBy: adminId,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This request has already been processed.");
  }
  log.info({ requestId, adminId }, "Request rejected");
  return prisma.request.findUniqueOrThrow({ where: { id: requestId } });
}
