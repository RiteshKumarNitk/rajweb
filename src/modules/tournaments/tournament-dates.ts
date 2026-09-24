/**
 * Tournament instants are stored as real timestamps.
 *
 * - `YYYY-MM-DD` (legacy date inputs) stays UTC midnight so existing rows round-trip.
 * - `YYYY-MM-DDTHH:mm` (admin datetime-local, no timezone) is India Standard Time.
 * - Full ISO strings that already include a timezone are parsed as-is.
 */

const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})$/;
const LOCAL_MINUTES = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/;
const IST = "Asia/Kolkata";

export function parseTournamentInstant(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = DATE_ONLY.test(trimmed)
    ? new Date(`${trimmed}T00:00:00.000Z`)
    : LOCAL_MINUTES.test(trimmed)
      ? new Date(`${trimmed}:00+05:30`)
      : new Date(trimmed);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDatetimeLocalValue(value: Date | string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

export function formatTournamentSchedule(value: Date | string): string {
  const date = new Date(value);
  const legacyDateOnly =
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (legacyDateOnly) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export interface TournamentDateInput {
  startDate: string;
  endDate: string;
  registrationStart?: string | null;
  registrationDeadline?: string | null;
}

/**
 * Registration start < registration end < tournament start, and
 * tournament start <= tournament end. Omitted registration bounds are skipped.
 */
export function tournamentDateOrderError(input: TournamentDateInput): string | null {
  const start = parseTournamentInstant(input.startDate);
  const end = parseTournamentInstant(input.endDate);
  if (!start) return "Tournament start date is not valid";
  if (!end) return "Tournament end date is not valid";
  if (end < start) return "Tournament end must be on or after the tournament start";

  const regStart = input.registrationStart ? parseTournamentInstant(input.registrationStart) : null;
  const regEnd = input.registrationDeadline ? parseTournamentInstant(input.registrationDeadline) : null;
  if (input.registrationStart && !regStart) return "Registration start is not a valid date";
  if (input.registrationDeadline && !regEnd) return "Registration end is not a valid date";

  if (regStart && regEnd && regStart >= regEnd) {
    return "Registration start must be before registration end";
  }
  if (regEnd && regEnd >= start) {
    return "Registration end must be before the tournament start";
  }
  if (regStart && regStart >= start) {
    return "Registration start must be before the tournament start";
  }
  return null;
}

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function formatTournamentStatus(status: string): string {
  return TOURNAMENT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

/** Statuses safe to show on the public site. Drafts stay hidden. */
export const PUBLIC_TOURNAMENT_STATUSES = [
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

/** Account listing: upcoming events, including closed registration. */
export const ACCOUNT_TOURNAMENT_STATUSES = [
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "IN_PROGRESS",
] as const;
