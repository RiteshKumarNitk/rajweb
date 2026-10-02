import { formatTournamentSchedule } from "@/modules/tournaments/tournament-dates";

/**
 * One source of truth for "can this player register?", used by the
 * registration API and by the account pages, so a page never offers
 * "Register Now" for something the API will refuse, and a refusal always
 * says why.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Legacy date-only values are stored as UTC midnight of the calendar date. */
function isDateOnly(d: Date): boolean {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
}

/**
 * The real registration window. A date-only start opens at 00:00 IST on that
 * date; a date-only deadline stays open until the end of that date in IST —
 * the way the date is shown ("closes 27 Sep") and read. Exact times (admin
 * datetime inputs) are used as stored.
 */
export function registrationWindow(t: { registrationStart: Date | null; registrationDeadline: Date | null }) {
  const opensAt = t.registrationStart
    ? isDateOnly(t.registrationStart)
      ? new Date(t.registrationStart.getTime() - IST_OFFSET_MS)
      : t.registrationStart
    : null;
  const closesAt = t.registrationDeadline
    ? isDateOnly(t.registrationDeadline)
      ? new Date(t.registrationDeadline.getTime() + DAY_MS - IST_OFFSET_MS)
      : t.registrationDeadline
    : null;
  return { opensAt, closesAt };
}

export type RegistrationBlock =
  | "UNAVAILABLE"
  | "NOT_OPEN_YET"
  | "CLOSED"
  | "NO_CATEGORIES"
  | "FULL"
  | "NO_PLAYER"
  | "NOT_APPROVED"
  | "ALREADY_REGISTERED";

export interface RegistrationState {
  open: boolean;
  block: RegistrationBlock | null;
  /** Shown to the member as-is. */
  message: string | null;
}

export interface TournamentForEligibility {
  status: string;
  registrationStart: Date | null;
  registrationDeadline: Date | null;
  maxParticipants: number | null;
  requiresApprovedPlayer: boolean;
}

const blocked = (block: RegistrationBlock, message: string): RegistrationState => ({ open: false, block, message });
const OPEN: RegistrationState = { open: true, block: null, message: null };

/** Tournament-level state: status, window, categories, capacity. */
export function tournamentRegistrationState(
  t: TournamentForEligibility,
  counts: { activeCategories: number; occupied: number },
  now: Date = new Date()
): RegistrationState {
  if (t.status === "DRAFT" || t.status === "CANCELLED") {
    return blocked("UNAVAILABLE", "Registration is not available for this tournament.");
  }
  const { opensAt, closesAt } = registrationWindow(t);
  if (t.status !== "REGISTRATION_OPEN") {
    return blocked("CLOSED", "Registration is closed.");
  }
  if (opensAt && now < opensAt) {
    return blocked("NOT_OPEN_YET", `Registration has not opened yet. It opens ${formatTournamentSchedule(t.registrationStart!)}.`);
  }
  if (closesAt && now >= closesAt) return blocked("CLOSED", "Registration is closed.");
  if (counts.activeCategories === 0) {
    return blocked("NO_CATEGORIES", "No categories are open for registration yet.");
  }
  if (t.maxParticipants != null && counts.occupied >= t.maxParticipants) {
    return blocked("FULL", "Tournament is full.");
  }
  return OPEN;
}

/** Adds the player's side: profile, approval, existing entry. */
export function playerRegistrationState(
  tournamentState: RegistrationState,
  t: Pick<TournamentForEligibility, "requiresApprovedPlayer">,
  player: { status: string } | null,
  alreadyRegistered: boolean
): RegistrationState {
  if (alreadyRegistered) return blocked("ALREADY_REGISTERED", "You are already registered.");
  if (!tournamentState.open) return tournamentState;
  if (!player) return blocked("NO_PLAYER", "Register as a player to enter tournaments.");
  if (t.requiresApprovedPlayer && player.status !== "APPROVED") {
    return blocked("NOT_APPROVED", "Your player profile is not approved.");
  }
  return OPEN;
}

/** Registrations that take a place (count toward capacity). */
export const OCCUPYING_REGISTRATION_STATUSES = ["PENDING", "APPROVED"] as const;

/** Label for lists: the stored status, corrected when the window has actually passed. */
export function effectiveRegistrationLabel(state: RegistrationState, status: string): string | null {
  if (status !== "REGISTRATION_OPEN") return null;
  if (state.block === "CLOSED") return "Registration Closed";
  if (state.block === "NOT_OPEN_YET") return "Opens Soon";
  if (state.block === "FULL") return "Full";
  return null;
}
