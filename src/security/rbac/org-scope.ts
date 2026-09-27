import { AppError } from "@/core/errors/app-error";
import { ROLES, type SessionUser } from "@/security/rbac/permissions";

/**
 * Organisational scope — the second half of authorization next to
 * permissions. Permissions say *what* a user may do; scope says *whose data*
 * they may do it to.
 *
 *   GLOBAL   super-admin (hardcoded safety net) or a user flagged
 *            isFederationWide. Never restricted by state or district; a UI
 *            state filter is a display choice only.
 *   STATE    User.stateId set, no district. Sees everything owned by that state.
 *   DISTRICT User.districtId set. Sees only that district (its state comes
 *            from District.stateId and is carried for convenience).
 *   NONE     A scoped user with neither assigned — matches nothing, never
 *            silently "everything".
 *
 * Ownership model (see prisma/schema.prisma):
 *   District.stateId                          — direct
 *   Player / Coach / *Membership.districtId   — state inherited via district
 *   Certificates, Requests, TournamentRegistrations — inherited via player/coach
 *   Tournament.stateId (+ optional districtId) — direct (state-wide tournaments
 *                                                have no district)
 *
 * Pure and Prisma-free so client components may import the types.
 */
export type OrgScope =
  | { level: "GLOBAL" }
  | { level: "STATE"; stateId: string }
  | { level: "DISTRICT"; stateId: string | null; districtId: string }
  | { level: "NONE" };

/** Never a real cuid — used so "no scope" still produces a valid filter that matches zero rows. */
const NO_MATCH = "__no-scope-match__";

export function getOrgScope(user: SessionUser): OrgScope {
  if (user.role === ROLES.SUPER_ADMIN || user.isFederationWide === true) return { level: "GLOBAL" };
  if (user.districtId) return { level: "DISTRICT", districtId: user.districtId, stateId: user.stateId ?? null };
  if (user.stateId) return { level: "STATE", stateId: user.stateId };
  return { level: "NONE" };
}

export function isGlobalScope(user: SessionUser): boolean {
  return getOrgScope(user).level === "GLOBAL";
}

// ─── Prisma `where` fragments (spread into queries; server-side filtering) ───

/** Player, Coach, Club/School/AcademyMembership — anything with `districtId` + `district`. */
export function districtOwnedWhere(scope: OrgScope) {
  switch (scope.level) {
    case "GLOBAL":
      return {};
    case "STATE":
      return { district: { stateId: scope.stateId } };
    case "DISTRICT":
      return { districtId: scope.districtId };
    case "NONE":
      return { districtId: NO_MATCH };
  }
}

/** The District model itself. */
export function districtWhere(scope: OrgScope) {
  switch (scope.level) {
    case "GLOBAL":
      return {};
    case "STATE":
      return { stateId: scope.stateId };
    case "DISTRICT":
      return { id: scope.districtId };
    case "NONE":
      return { id: NO_MATCH };
  }
}

/** The State model itself. */
export function stateWhere(scope: OrgScope) {
  switch (scope.level) {
    case "GLOBAL":
      return {};
    case "STATE":
      return { id: scope.stateId };
    case "DISTRICT":
      return { id: scope.stateId ?? NO_MATCH };
    case "NONE":
      return { id: NO_MATCH };
  }
}

/** Tournament — state-owned directly; district users see only their district's tournaments. */
export function tournamentWhere(scope: OrgScope) {
  switch (scope.level) {
    case "GLOBAL":
      return {};
    case "STATE":
      return { stateId: scope.stateId };
    case "DISTRICT":
      return { districtId: scope.districtId };
    case "NONE":
      return { id: NO_MATCH };
  }
}

/**
 * Records that carry their own `stateId` / `districtId` columns: equipment
 * items, equipment orders, certificate signatories. Rows with both null are
 * federation-level (RRA central) and visible to GLOBAL only.
 */
export function directOwnedWhere(scope: OrgScope) {
  return tournamentWhere(scope);
}

/**
 * Player certificates. A tournament certificate belongs to its tournament's
 * state/district (stable even if the player later moves district); a
 * registration certificate (no tournament) follows the player's district.
 */
export function playerCertificateWhere(scope: OrgScope) {
  if (scope.level === "GLOBAL") return {};
  return {
    OR: [
      { tournamentId: { not: null }, tournament: tournamentWhere(scope) },
      { tournamentId: null, player: districtOwnedWhere(scope) },
    ],
  };
}

/** Requests — owned through the linked Player or Coach. */
export function requestWhere(scope: OrgScope) {
  if (scope.level === "GLOBAL") return {};
  const owned = districtOwnedWhere(scope);
  return { OR: [{ player: owned }, { coach: owned }] };
}

/** User accounts — a scoped viewer sees staff assigned inside their scope. */
export function userWhere(scope: OrgScope) {
  switch (scope.level) {
    case "GLOBAL":
      return {};
    case "STATE":
      return { OR: [{ stateId: scope.stateId }, { district: { stateId: scope.stateId } }] };
    case "DISTRICT":
      return { districtId: scope.districtId };
    case "NONE":
      return { id: NO_MATCH };
  }
}

// ─── Record-level assertions (IDOR protection) ───────────────────────────────

export interface ScopeTarget {
  /** District the record belongs to (null for state-wide records). */
  districtId: string | null;
  /** State the record belongs to — District.stateId, or Tournament.stateId. */
  stateId: string | null;
}

export function isInScope(scope: OrgScope, target: ScopeTarget): boolean {
  switch (scope.level) {
    case "GLOBAL":
      return true;
    case "STATE":
      return target.stateId !== null && target.stateId === scope.stateId;
    case "DISTRICT":
      return target.districtId !== null && target.districtId === scope.districtId;
    case "NONE":
      return false;
  }
}

/**
 * Throws 404 (not 403) when the record is outside the caller's scope, so an
 * admin probing another state's IDs cannot tell "exists elsewhere" from
 * "does not exist". Pass the same message the route uses for a missing record.
 */
export function assertInScope(user: SessionUser, target: ScopeTarget, notFoundMessage = "Resource not found"): void {
  if (!isInScope(getOrgScope(user), target)) {
    throw AppError.notFound(notFoundMessage);
  }
}

/** Builds a ScopeTarget from a record loaded with `district: { select: { stateId: true } }`. */
export function districtTarget(record: { districtId: string; district: { stateId: string | null } | null }): ScopeTarget {
  return { districtId: record.districtId, stateId: record.district?.stateId ?? null };
}

/** Prisma `include`/`select` fragment that loads what districtTarget() needs. */
export const DISTRICT_STATE_SELECT = { district: { select: { stateId: true } } } as const;
