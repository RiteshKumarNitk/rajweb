import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import type { SessionUser } from "@/security/rbac/permissions";
import { getOrgScope } from "@/security/rbac/org-scope";

export interface Ownership {
  stateId: string | null;
  districtId: string | null;
}

/**
 * Decides which inventory/registry a directly-owned record (equipment item,
 * certificate signatory) belongs to — from the caller's scope, never from the
 * client alone.
 *
 *   DISTRICT scope: always the caller's district (and its state).
 *   STATE scope:    the caller's state; an optional district must be in it.
 *   GLOBAL scope:   any district (its state wins), any state, or — when
 *                   `allowCentral` — neither (RRA central / federation level).
 *
 * `requested.districtId === null` means "no district"; `undefined` means "not
 * provided" (keep `current` on updates).
 */
export async function resolveOwnership(
  user: SessionUser,
  requested: { stateId?: string | null; districtId?: string | null },
  options: { allowCentral: boolean; current?: Ownership }
): Promise<Ownership> {
  const scope = getOrgScope(user);
  const { current } = options;

  if (scope.level === "NONE") {
    throw AppError.forbidden("A state or district assignment is required for this action");
  }

  if (scope.level === "DISTRICT") {
    const district = await prisma.district.findUnique({
      where: { id: scope.districtId },
      select: { id: true, stateId: true },
    });
    if (!district?.stateId) {
      throw AppError.forbidden("Your district is not assigned to a state yet. Contact the Super Admin.");
    }
    return { stateId: district.stateId, districtId: district.id };
  }

  const districtId = requested.districtId === undefined ? current?.districtId ?? null : requested.districtId;
  if (districtId) {
    const district = await prisma.district.findUnique({ where: { id: districtId }, select: { id: true, stateId: true } });
    if (!district) throw AppError.validation("Invalid district selected");
    if (!district.stateId) throw AppError.validation("The selected district is not assigned to a state");
    if (scope.level === "STATE" && district.stateId !== scope.stateId) {
      throw AppError.validation("Invalid district selected");
    }
    if (requested.stateId && requested.stateId !== district.stateId) {
      throw AppError.validation("The selected district does not belong to the selected state");
    }
    return { stateId: district.stateId, districtId: district.id };
  }

  if (scope.level === "STATE") return { stateId: scope.stateId, districtId: null };

  // GLOBAL, no district.
  const stateId = requested.stateId === undefined ? current?.stateId ?? null : requested.stateId;
  if (stateId) {
    const state = await prisma.state.findUnique({ where: { id: stateId }, select: { id: true } });
    if (!state) throw AppError.validation("Invalid state selected");
    return { stateId: state.id, districtId: null };
  }
  if (options.allowCentral) return { stateId: null, districtId: null };
  throw AppError.validation("Select the state this record belongs to");
}
