import { AppError } from "@/core/errors/app-error";
import { ROLES, type SessionUser } from "@/security/rbac/permissions";

/**
 * Federation-wide access is now per-user, not per-role-name: super-admin is a
 * permanent, hardcoded safety net; every other role (built-in or a Super
 * Admin-created dynamic one) only bypasses district scoping when the user has
 * been explicitly granted `isFederationWide` — set on the person, not the
 * role, so the same role (e.g. "Certificate Manager") can be district-locked
 * for one person and federation-wide for another. See admin-scope.ts /
 * /admin/users for where that flag is assigned.
 */
export function isFederationWide(user: SessionUser): boolean {
  return user.role === ROLES.SUPER_ADMIN || user.isFederationWide === true;
}

/**
 * A district id that can never exist (cuid()s are ~25 lowercase base36
 * characters and never equal this literal) — used so "district-scoped user,
 * no district assigned" can still be expressed as a plain `districtId: string`
 * that every existing `districtId ? { districtId } : undefined`-style call
 * site already handles correctly, matching zero rows instead of silently
 * falling through to "no filter = all districts".
 */
const NO_DISTRICT_MATCH = "__no-district-assigned__";

/**
 * districtId in `where` scopes to that district; unrestricted (undefined) for
 * federation-wide users; a district-scoped user with NO district assigned
 * gets a sentinel that matches zero rows — never silently "all districts".
 */
export function getDistrictWhereClause(user: SessionUser): { districtId?: string } {
  if (isFederationWide(user)) return {};
  return { districtId: user.districtId ?? NO_DISTRICT_MATCH };
}

export function assertDistrictAccess(user: SessionUser, entityDistrictId: string): void {
  if (isFederationWide(user)) return;

  if (!user.districtId) {
    throw AppError.forbidden("District assignment required");
  }
  if (user.districtId !== entityDistrictId) {
    throw AppError.forbidden("Access denied for this district");
  }
}

/**
 * State-wide tournaments (no district) are federation-managed. A district
 * admin can manage only tournaments in their own district.
 */
export function assertTournamentDistrictAccess(user: SessionUser, districtId: string | null): void {
  if (isFederationWide(user)) return;
  if (!districtId) {
    throw AppError.forbidden("State-wide tournaments are managed by federation administrators");
  }
  assertDistrictAccess(user, districtId);
}

export function playerCertDistrictWhere(districtId?: string) {
  return districtId ? { player: { districtId } } : {};
}

export function coachCertDistrictWhere(districtId?: string) {
  return districtId ? { coach: { districtId } } : {};
}
