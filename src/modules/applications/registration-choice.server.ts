import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";

export type RegistrationKind = "player" | "coach" | "membership";

export const REGISTRATION_KINDS: RegistrationKind[] = ["player", "coach", "membership"];

export const REGISTRATION_KIND_LABELS: Record<RegistrationKind, string> = {
  player: "Player",
  coach: "Coach",
  membership: "Membership",
};

export interface RegistrationChoice {
  /** Status per kind; null when the account has no application of that kind. */
  status: Record<RegistrationKind, string | null>;
  /**
   * Kinds this account may open or apply for. An account holds ONE
   * registration: with no application, all three; once any application
   * exists, only its kind — and an APPROVED kind outranks pending/returned
   * ones (records from before this rule are kept, not deleted).
   */
  allowed: RegistrationKind[];
  /** The kind the account is registered for (approved first), if any. */
  primary: RegistrationKind | null;
}

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * One status for the Club/School/Academy memberships together: approved
 * (APPROVED or ACTIVE) > pending > returned > suspended > expired.
 */
function membershipStatus(statuses: string[]): string | null {
  if (statuses.some((s) => s === "APPROVED" || s === "ACTIVE")) return "APPROVED";
  for (const s of ["PENDING", "REJECTED", "SUSPENDED", "EXPIRED"]) if (statuses.includes(s)) return s;
  return statuses[0] ?? null;
}

/**
 * The account's registration state, read from the database (Player, Coach
 * and Club/School/Academy records linked to the user) — never from what the
 * client says it chose.
 */
export async function getRegistrationChoice(userId: string | null | undefined, db: Db = prisma): Promise<RegistrationChoice> {
  const empty: RegistrationChoice = {
    status: { player: null, coach: null, membership: null },
    allowed: [...REGISTRATION_KINDS],
    primary: null,
  };
  if (!userId) return empty;

  const [player, coach, club, school, academy] = await Promise.all([
    db.player.findUnique({ where: { userId }, select: { status: true } }),
    db.coach.findUnique({ where: { userId }, select: { status: true } }),
    db.clubMembership.findUnique({ where: { userId }, select: { status: true } }),
    db.schoolMembership.findUnique({ where: { userId }, select: { status: true } }),
    db.academyMembership.findUnique({ where: { userId }, select: { status: true } }),
  ]);

  const status: RegistrationChoice["status"] = {
    player: player?.status ?? null,
    coach: coach?.status ?? null,
    membership: membershipStatus([club, school, academy].filter((m) => m !== null).map((m) => m.status)),
  };
  const held = REGISTRATION_KINDS.filter((k) => status[k] !== null);
  const approved = held.filter((k) => status[k] === "APPROVED");
  const allowed = approved.length ? approved : held.length ? held : [...REGISTRATION_KINDS];
  return { status, allowed, primary: approved[0] ?? held[0] ?? null };
}

export function registrationLockedMessage(choice: RegistrationChoice): string {
  const primary = choice.primary;
  if (!primary) return "This registration is not available for your account.";
  const label = REGISTRATION_KIND_LABELS[primary];
  const held =
    choice.status[primary] === "APPROVED"
      ? primary === "membership"
        ? "You hold an approved Membership"
        : `You are registered as a ${label}`
      : `You already have a ${label} application`;
  return `${held}. An account can hold only one registration — Player, Coach or Membership.`;
}

/** 409 unless the account may open/apply for `kind` (used where no new record is created, e.g. resubmission). */
export async function assertRegistrationAllowed(userId: string, kind: RegistrationKind): Promise<void> {
  const choice = await getRegistrationChoice(userId);
  if (!choice.allowed.includes(kind)) throw AppError.conflict(registrationLockedMessage(choice));
}

/**
 * Runs `create` for a signed-in applicant under a per-account lock, after
 * checking the account may apply for `kind`. Two submissions racing from the
 * same account are serialised, so they cannot both pass the check.
 */
export async function withRegistrationChoice<T>(
  userId: string,
  kind: RegistrationKind,
  create: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`registration:${userId}`}))`;
    const choice = await getRegistrationChoice(userId, tx);
    if (!choice.allowed.includes(kind)) throw AppError.conflict(registrationLockedMessage(choice));
    return create(tx);
  });
}
