import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import type { SessionUser } from "@/security/rbac/permissions";
import { getOrgScope } from "@/security/rbac/org-scope";

export interface TournamentOwnership {
  stateId: string;
  districtId: string | null;
}

/**
 * Decides which state (and optional district) owns a tournament being created
 * or re-homed, from the caller's scope — never from the client alone.
 *
 *   DISTRICT scope: always the caller's own district (and its state).
 *   STATE scope:    always the caller's state; an optional district must be in it.
 *   GLOBAL scope:   any district (its state wins) or any state for a
 *                   state-wide event. With exactly one active state and no
 *                   input, that state is used so single-state setups need no picker.
 *
 * `requested.districtId === null` means "state-wide"; `undefined` means "not provided".
 */
export async function resolveTournamentOwnership(
  user: SessionUser,
  requested: { stateId?: string | null; districtId?: string | null },
  current?: TournamentOwnership
): Promise<TournamentOwnership> {
  const scope = getOrgScope(user);

  if (scope.level === "NONE") {
    throw AppError.forbidden("A state or district assignment is required to manage tournaments");
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
    const district = await prisma.district.findUnique({
      where: { id: districtId },
      select: { id: true, stateId: true },
    });
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

  if (scope.level === "STATE") {
    return { stateId: scope.stateId, districtId: null };
  }

  // GLOBAL, state-wide tournament.
  const stateId = requested.stateId ?? current?.stateId ?? null;
  if (stateId) {
    const state = await prisma.state.findUnique({ where: { id: stateId }, select: { id: true } });
    if (!state) throw AppError.validation("Invalid state selected");
    return { stateId: state.id, districtId: null };
  }

  const activeStates = await prisma.state.findMany({ where: { isActive: true }, select: { id: true }, take: 2 });
  if (activeStates.length === 1) return { stateId: activeStates[0].id, districtId: null };
  throw AppError.validation("Select the state this tournament belongs to");
}
