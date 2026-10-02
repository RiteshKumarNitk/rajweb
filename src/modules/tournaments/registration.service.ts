import { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import {
  OCCUPYING_REGISTRATION_STATUSES,
  playerRegistrationState,
  tournamentRegistrationState,
} from "@/modules/tournaments/registration-eligibility";

export interface CreatedTournamentRegistration {
  id: string;
  tournamentId: string;
  tournamentName: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  status: string;
  registeredAt: Date;
}

/**
 * Registers the session user's player for one active category.
 * `amount` is copied from the category fee inside the same locked transaction
 * and is never taken from the client.
 *
 * The existing unique key is (tournamentId, playerId): one registration per
 * player per tournament, which also prevents a second category entry.
 * Eligibility (status, window, categories, capacity, player) is the same
 * function the account pages use, so the page and the API never disagree.
 */
export async function registerForTournament(
  userId: string,
  tournamentId: string,
  categoryId: string
): Promise<CreatedTournamentRegistration> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;

      const tournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: {
          id: true,
          name: true,
          status: true,
          stateId: true,
          districtId: true,
          registrationStart: true,
          registrationDeadline: true,
          maxParticipants: true,
          requiresApprovedPlayer: true,
        },
      });
      if (!tournament) throw AppError.notFound("Tournament not found");

      const [activeCategories, occupied, player] = await Promise.all([
        tx.tournamentRegistrationCategory.count({ where: { tournamentId, isActive: true } }),
        tx.tournamentRegistration.count({ where: { tournamentId, status: { in: [...OCCUPYING_REGISTRATION_STATUSES] } } }),
        // The session user's own player — never an id from the client.
        tx.player.findUnique({ where: { userId }, select: { id: true, status: true } }),
      ]);
      const existing = player
        ? await tx.tournamentRegistration.findUnique({
            where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
            select: { categoryId: true },
          })
        : null;

      const state = playerRegistrationState(
        tournamentRegistrationState(tournament, { activeCategories, occupied }),
        tournament,
        player,
        Boolean(existing)
      );
      if (state.block === "ALREADY_REGISTERED") {
        throw AppError.conflict(
          existing?.categoryId === categoryId
            ? "You are already registered for this category."
            : "You are already registered for this tournament."
        );
      }
      if (!state.open || !player) throw AppError.validation(state.message ?? "Registration is not available.");

      const category = await tx.tournamentRegistrationCategory.findFirst({
        where: { id: categoryId, tournamentId, isActive: true },
      });
      if (!category || !Number.isInteger(category.fee) || category.fee < 0) {
        throw AppError.validation("This category is not available for registration.");
      }

      const registration = await tx.tournamentRegistration.create({
        data: {
          tournamentId,
          playerId: player.id,
          categoryId: category.id,
          amount: category.fee,
          status: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          module: "tournaments",
          entityId: registration.id,
          entityType: "TournamentRegistration",
          details: {
            event: "TOURNAMENT_REGISTRATION_CREATED",
            tournamentId,
            tournamentName: tournament.name,
            categoryId: category.id,
            categoryName: category.name,
            playerId: player.id,
            registrationId: registration.id,
            amount: registration.amount,
            stateId: tournament.stateId,
            districtId: tournament.districtId,
          },
        },
      });

      return {
        id: registration.id,
        tournamentId,
        tournamentName: tournament.name,
        categoryId: category.id,
        categoryName: category.name,
        amount: category.fee,
        status: registration.status,
        registeredAt: registration.registeredAt,
      };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw AppError.conflict("You are already registered for this category.");
    }
    throw error;
  }
}

/**
 * The only amount a registration may ever be charged: the snapshot written at
 * registration time. Legacy rows created before the snapshot existed can have
 * a null amount — those are refused (never re-priced from the category's
 * current fee, never taken from the client) and must be resolved by an admin.
 */
export function getPayableRegistrationAmount(registration: { id: string; amount: number | null }): number {
  const { amount } = registration;
  if (amount == null || !Number.isInteger(amount) || amount < 0) {
    throw AppError.validation(
      "This registration has no valid registration-time amount and cannot be paid online. Please contact RRA administration."
    );
  }
  return amount;
}
