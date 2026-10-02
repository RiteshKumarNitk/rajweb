import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import {
  GENDER_LABELS,
  PLAYER_CATEGORIES,
  PROFILE_FIELDS_BY_TYPE,
  PROFILE_FIELD_LABELS,
  REQUEST_TYPE_LABELS,
  type ProfileFieldValue,
  type RequestTypeValue,
} from "@/modules/requests/request-types";
import type { Prisma } from "@prisma/client";
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
  /** PROFILE_CORRECTION of one known field; requestedValue is then its new value. */
  requestedField?: ProfileFieldValue;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Checks and normalises the new value of a structured profile correction. */
function normaliseProfileValue(field: ProfileFieldValue, raw: string | undefined): string {
  const value = (raw ?? "").trim();
  switch (field) {
    case "NAME":
      if (value.length < 2 || value.length > 100) throw AppError.validation("Enter the corrected full name (2–100 characters)");
      return sanitizeText(value);
    case "DATE_OF_BIRTH": {
      const d = new Date(`${value}T00:00:00.000Z`);
      const year = d.getUTCFullYear();
      if (!DATE_ONLY.test(value) || Number.isNaN(d.getTime()) || d > new Date() || year < 1920) {
        throw AppError.validation("Enter a valid date of birth (YYYY-MM-DD)");
      }
      return value;
    }
    case "GENDER":
      if (!GENDER_LABELS[value]) throw AppError.validation("Select Male, Female or Other");
      return value;
    case "CATEGORY":
      if (!(PLAYER_CATEGORIES as readonly string[]).includes(value)) throw AppError.validation("Select a valid playing category");
      return value;
  }
}

type ProfileRecord = {
  name: string;
  email: string;
  mobile: string;
  dateOfBirth?: Date;
  gender?: string;
  category?: string | null;
  district: { name: string };
};

/** The record's current value of a field, as stored (dates as YYYY-MM-DD). */
function currentFieldValue(record: ProfileRecord, field: ProfileFieldValue): string {
  switch (field) {
    case "NAME":
      return record.name;
    case "DATE_OF_BIRTH":
      return record.dateOfBirth ? record.dateOfBirth.toISOString().slice(0, 10) : "";
    case "GENDER":
      return record.gender ?? "";
    case "CATEGORY":
      return record.category ?? "";
  }
}

async function loadProfile(input: { playerId?: string; coachId?: string }): Promise<ProfileRecord | null> {
  if (input.playerId) {
    return prisma.player.findUnique({
      where: { id: input.playerId },
      select: { name: true, email: true, mobile: true, dateOfBirth: true, gender: true, category: true, district: { select: { name: true } } },
    });
  }
  if (input.coachId) {
    return prisma.coach.findUnique({
      where: { id: input.coachId },
      select: { name: true, email: true, mobile: true, district: { select: { name: true } } },
    });
  }
  return null;
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

  // The "current" value is read from the record on the server — never taken
  // from the client — so reviewers and the audit see what was really on file.
  const profile = await loadProfile(input);
  if (!profile) throw AppError.notFound("Registration not found");
  let currentValue = input.currentValue ? sanitizeText(input.currentValue) : undefined;
  let requestedValue = input.requestedValue ? sanitizeText(input.requestedValue) : undefined;
  let requestedField: ProfileFieldValue | undefined;

  if (input.requestedField) {
    if (input.type !== "PROFILE_CORRECTION") throw AppError.validation("A field can only be named on a Profile Correction");
    const allowed = PROFILE_FIELDS_BY_TYPE[input.playerId ? "player" : "coach"];
    if (!allowed.includes(input.requestedField)) throw AppError.validation("That field cannot be corrected on this registration");
    requestedField = input.requestedField;
    requestedValue = normaliseProfileValue(requestedField, input.requestedValue);
    currentValue = currentFieldValue(profile, requestedField);
    if (currentValue === requestedValue) {
      throw AppError.validation(`Your ${PROFILE_FIELD_LABELS[requestedField].toLowerCase()} is already ${requestedValue}`);
    }
  } else if (input.type === "CONTACT_UPDATE") {
    currentValue = [input.requestedMobile ? `Mobile: ${profile.mobile}` : null, input.requestedEmail ? `Email: ${profile.email}` : null]
      .filter(Boolean)
      .join(", ");
  } else if (input.type === "ADDRESS_UPDATE") {
    const home = await prisma.userProfile.findUnique({ where: { userId: input.userId }, select: { address: true } });
    currentValue = home?.address ?? undefined;
  } else if (input.type === "DISTRICT_CHANGE") {
    currentValue = profile.district.name;
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
      currentValue: currentValue || undefined,
      requestedValue,
      requestedField,
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

/** One applied field change: what the record held before approval and what it holds now. */
export interface AppliedChange {
  field: string;
  previousValue: string | null;
  newValue: string | null;
}

async function applyProfileCorrection(
  tx: Prisma.TransactionClient,
  request: { playerId: string | null; coachId: string | null; requestedField: string | null; requestedValue: string | null },
  changes: AppliedChange[]
) {
  const field = request.requestedField as ProfileFieldValue | null;
  if (!field || !request.requestedValue) return;
  const value = request.requestedValue;
  if (request.playerId) {
    const before = await tx.player.findUniqueOrThrow({
      where: { id: request.playerId },
      select: { name: true, email: true, mobile: true, dateOfBirth: true, gender: true, category: true, district: { select: { name: true } } },
    });
    const data =
      field === "NAME"
        ? { name: value }
        : field === "DATE_OF_BIRTH"
          ? { dateOfBirth: new Date(`${value}T00:00:00.000Z`) }
          : field === "GENDER"
            ? { gender: value as "MALE" | "FEMALE" | "OTHER" }
            : { category: value };
    await tx.player.update({ where: { id: request.playerId }, data });
    changes.push({ field, previousValue: currentFieldValue(before, field) || null, newValue: value });
  } else if (request.coachId && field === "NAME") {
    const before = await tx.coach.findUniqueOrThrow({ where: { id: request.coachId }, select: { name: true } });
    await tx.coach.update({ where: { id: request.coachId }, data: { name: value } });
    changes.push({ field, previousValue: before.name, newValue: value });
  }
}

export async function approveRequest(
  requestId: string,
  adminId: string,
  adminRemarks?: string
): Promise<{ request: Prisma.RequestGetPayload<object>; changes: AppliedChange[] }> {
  const changes: AppliedChange[] = [];
  const request = await prisma.$transaction(async (tx) => {
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
      case "PROFILE_CORRECTION": {
        await applyProfileCorrection(tx, request, changes);
        break;
      }
      case "CONTACT_UPDATE": {
        const data: { mobile?: string; email?: string } = {};
        if (request.requestedMobile) data.mobile = request.requestedMobile;
        if (request.requestedEmail) data.email = request.requestedEmail;
        if (Object.keys(data).length > 0) {
          const before = request.playerId
            ? await tx.player.findUnique({ where: { id: request.playerId }, select: { mobile: true, email: true } })
            : request.coachId
              ? await tx.coach.findUnique({ where: { id: request.coachId }, select: { mobile: true, email: true } })
              : null;
          if (request.playerId) await tx.player.update({ where: { id: request.playerId }, data });
          if (request.coachId) await tx.coach.update({ where: { id: request.coachId }, data });
          if (data.mobile) changes.push({ field: "MOBILE", previousValue: before?.mobile ?? null, newValue: data.mobile });
          if (data.email) changes.push({ field: "EMAIL", previousValue: before?.email ?? null, newValue: data.email });
        }
        break;
      }
      case "DISTRICT_CHANGE": {
        if (request.requestedDistrictId) {
          const before = request.playerId
            ? await tx.player.findUnique({ where: { id: request.playerId }, select: { districtId: true } })
            : request.coachId
              ? await tx.coach.findUnique({ where: { id: request.coachId }, select: { districtId: true } })
              : null;
          changes.push({ field: "DISTRICT", previousValue: before?.districtId ?? null, newValue: request.requestedDistrictId });
          if (request.playerId) {
            await tx.player.update({ where: { id: request.playerId }, data: { districtId: request.requestedDistrictId } });
          }
          if (request.coachId) {
            await tx.coach.update({ where: { id: request.coachId }, data: { districtId: request.requestedDistrictId } });
          }
          // Keep the member's home district (equipment catalog / orders scope) in step.
          const moved = await tx.district.findUnique({ where: { id: request.requestedDistrictId }, select: { stateId: true } });
          await tx.userProfile.updateMany({
            where: { userId: request.userId, districtId: { not: null } },
            data: { districtId: request.requestedDistrictId, stateId: moved?.stateId ?? null },
          });
        }
        break;
      }
      case "ADDRESS_UPDATE": {
        if (request.requestedAddress) {
          const before = await tx.userProfile.findUnique({ where: { userId: request.userId }, select: { address: true } });
          changes.push({ field: "ADDRESS", previousValue: before?.address ?? null, newValue: request.requestedAddress });
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

    log.info({ requestId, adminId, type: request.type, applied: changes.length }, "Request approved");
    return tx.request.findUniqueOrThrow({ where: { id: requestId } });
  });
  return { request, changes };
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
