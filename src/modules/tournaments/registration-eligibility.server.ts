import prisma from "@/infrastructure/database/prisma";
import {
  OCCUPYING_REGISTRATION_STATUSES,
  playerRegistrationState,
  tournamentRegistrationState,
  type RegistrationState,
  type TournamentForEligibility,
} from "@/modules/tournaments/registration-eligibility";

/**
 * Registration state of several tournaments for one (possibly absent) player,
 * with real capacity counts — what the account pages show next to "Register Now".
 */
export async function registrationStatesFor(
  tournaments: Array<TournamentForEligibility & { id: string; activeCategories: number }>,
  player: { id: string; status: string } | null
): Promise<Map<string, { tournament: RegistrationState; player: RegistrationState }>> {
  const ids = tournaments.map((t) => t.id);
  const [occupiedRows, ownRows] = await Promise.all([
    ids.length
      ? prisma.tournamentRegistration.groupBy({
          by: ["tournamentId"],
          where: { tournamentId: { in: ids }, status: { in: [...OCCUPYING_REGISTRATION_STATUSES] } },
          _count: { _all: true },
        })
      : [],
    player && ids.length
      ? prisma.tournamentRegistration.findMany({ where: { playerId: player.id, tournamentId: { in: ids } }, select: { tournamentId: true } })
      : [],
  ]);
  const occupied = new Map(occupiedRows.map((r) => [r.tournamentId, r._count._all]));
  const registered = new Set(ownRows.map((r) => r.tournamentId));

  const result = new Map<string, { tournament: RegistrationState; player: RegistrationState }>();
  for (const t of tournaments) {
    const tournamentState = tournamentRegistrationState(t, { activeCategories: t.activeCategories, occupied: occupied.get(t.id) ?? 0 });
    result.set(t.id, {
      tournament: tournamentState,
      player: playerRegistrationState(tournamentState, t, player, registered.has(t.id)),
    });
  }
  return result;
}
