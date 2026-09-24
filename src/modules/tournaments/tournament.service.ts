import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { slugify } from "@/lib/utils";
import { sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";
import type { TournamentCategory, TournamentStatus, TournamentEventType } from "@prisma/client";
import {
  parseTournamentInstant,
  tournamentDateOrderError,
  type TournamentDateInput,
} from "@/modules/tournaments/tournament-dates";

const log = createModuleLogger("tournaments");

export type { TournamentDateInput };

function requireInstant(value: string, label: string): Date {
  const date = parseTournamentInstant(value);
  if (!date) throw AppError.validation(`${label} is not a valid date`);
  return date;
}

/**
 * Registration start < registration end < tournament start <= tournament end.
 * A missing registration bound is allowed; an invalid combination is not.
 */
export function validateTournamentDates(input: TournamentDateInput): void {
  const message = tournamentDateOrderError(input);
  if (message) throw AppError.validation(message);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "tournament";
  let candidate = slug;
  let counter = 1;
  while (await prisma.tournament.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${counter++}`;
  }
  return candidate;
}

export interface CreateTournamentInput extends TournamentDateInput {
  name: string;
  description?: string;
  category: TournamentCategory;
  status?: TournamentStatus;
  districtId?: string | null;
  venue?: string | null;
  city?: string | null;
  maxParticipants?: number | null;
  banner?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  requiresApprovedPlayer?: boolean;
}

export async function createTournament(input: CreateTournamentInput) {
  validateTournamentDates(input);
  const slug = await uniqueSlug(input.name);

  const tournament = await prisma.tournament.create({
    data: {
      name: sanitizeText(input.name),
      slug,
      description: input.description ? sanitizeText(input.description) : undefined,
      category: input.category,
      status: input.status ?? "DRAFT",
      districtId: input.districtId ?? null,
      venue: input.venue ? sanitizeText(input.venue) : undefined,
      city: input.city ? sanitizeText(input.city) : undefined,
      startDate: requireInstant(input.startDate, "Tournament start"),
      endDate: requireInstant(input.endDate, "Tournament end"),
      registrationStart: input.registrationStart ? requireInstant(input.registrationStart, "Registration start") : undefined,
      registrationDeadline: input.registrationDeadline ? requireInstant(input.registrationDeadline, "Registration end") : undefined,
      maxParticipants: input.maxParticipants,
      banner: input.banner ? input.banner.trim() : undefined,
      contactName: input.contactName ? sanitizeText(input.contactName) : undefined,
      contactPhone: input.contactPhone ? input.contactPhone.trim() : undefined,
      contactEmail: input.contactEmail ? input.contactEmail.trim().toLowerCase() : undefined,
      requiresApprovedPlayer: input.requiresApprovedPlayer ?? true,
    },
    include: { district: true },
  });

  log.info({ tournamentId: tournament.id, slug: tournament.slug }, "Tournament created");
  return tournament;
}

export type UpdateTournamentInput = Partial<CreateTournamentInput>;

export async function updateTournament(id: string, input: UpdateTournamentInput) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound("Tournament not found");

  const merged: TournamentDateInput = {
    startDate: input.startDate ?? existing.startDate.toISOString(),
    endDate: input.endDate ?? existing.endDate.toISOString(),
    registrationStart:
      input.registrationStart !== undefined ? input.registrationStart : existing.registrationStart?.toISOString(),
    registrationDeadline:
      input.registrationDeadline !== undefined
        ? input.registrationDeadline
        : existing.registrationDeadline?.toISOString(),
  };
  validateTournamentDates(merged);

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      name: input.name !== undefined ? sanitizeText(input.name) : undefined,
      description: input.description !== undefined ? (input.description ? sanitizeText(input.description) : null) : undefined,
      category: input.category,
      status: input.status,
      districtId: input.districtId !== undefined ? input.districtId : undefined,
      venue: input.venue !== undefined ? (input.venue ? sanitizeText(input.venue) : null) : undefined,
      city: input.city !== undefined ? (input.city ? sanitizeText(input.city) : null) : undefined,
      startDate: input.startDate ? requireInstant(input.startDate, "Tournament start") : undefined,
      endDate: input.endDate ? requireInstant(input.endDate, "Tournament end") : undefined,
      registrationStart:
        input.registrationStart !== undefined
          ? input.registrationStart
            ? requireInstant(input.registrationStart, "Registration start")
            : null
          : undefined,
      registrationDeadline:
        input.registrationDeadline !== undefined
          ? input.registrationDeadline
            ? requireInstant(input.registrationDeadline, "Registration end")
            : null
          : undefined,
      maxParticipants: input.maxParticipants !== undefined ? input.maxParticipants : undefined,
      banner: input.banner !== undefined ? (input.banner ? input.banner.trim() : null) : undefined,
      contactName: input.contactName !== undefined ? (input.contactName ? sanitizeText(input.contactName) : null) : undefined,
      contactPhone: input.contactPhone !== undefined ? (input.contactPhone ? input.contactPhone.trim() : null) : undefined,
      contactEmail: input.contactEmail !== undefined ? (input.contactEmail ? input.contactEmail.trim().toLowerCase() : null) : undefined,
      requiresApprovedPlayer: input.requiresApprovedPlayer,
    },
    include: { district: true },
  });

  log.info({ tournamentId: id }, "Tournament updated");
  return tournament;
}

export interface CategoryInput {
  name: string;
  type: TournamentEventType;
  fee: number;
}

export async function createRegistrationCategory(tournamentId: string, input: CategoryInput) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw AppError.notFound("Tournament not found");

  return prisma.tournamentRegistrationCategory.create({
    data: {
      tournamentId,
      name: sanitizeText(input.name),
      type: input.type,
      fee: input.fee,
      isActive: true,
    },
  });
}

export async function updateRegistrationCategory(id: string, input: Partial<CategoryInput> & { isActive?: boolean }) {
  const existing = await prisma.tournamentRegistrationCategory.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!existing) throw AppError.notFound("Registration category not found");

  if (input.type && input.type !== existing.type && existing._count.registrations > 0) {
    throw AppError.validation(
      "This category already has registrations. Disable it and add a new category instead of changing its type."
    );
  }

  // Fee edits update only this category. TournamentRegistration.amount is a
  // snapshot written at registration time and is intentionally not touched.
  return prisma.tournamentRegistrationCategory.update({
    where: { id },
    data: {
      name: input.name !== undefined ? sanitizeText(input.name) : undefined,
      type: input.type,
      fee: input.fee,
      isActive: input.isActive,
    },
  });
}

/**
 * Deletes the category only if no registration has ever referenced it;
 * otherwise disables it instead, per the "never corrupt historical data"
 * requirement — a used category is deactivated, never destroyed.
 */
export async function removeOrDisableRegistrationCategory(id: string) {
  const existing = await prisma.tournamentRegistrationCategory.findUnique({
    where: { id },
    include: { _count: { select: { registrations: true } } },
  });
  if (!existing) throw AppError.notFound("Registration category not found");

  if (existing._count.registrations > 0) {
    await prisma.tournamentRegistrationCategory.update({ where: { id }, data: { isActive: false } });
    return { deleted: false, disabled: true };
  }

  await prisma.tournamentRegistrationCategory.delete({ where: { id } });
  return { deleted: true, disabled: false };
}
