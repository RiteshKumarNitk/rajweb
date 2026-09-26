import { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";

const OCCUPYING_STATUSES = ["PENDING", "APPROVED"] as const;

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
 */
export async function registerForTournament(
  userId: string,
  tournamentId: string,
  categoryId: string
): Promise<CreatedTournamentRegistration> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`;

      const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
      if (!tournament) throw AppError.notFound("Tournament not found");

      if (tournament.status !== "REGISTRATION_OPEN") {
        throw AppError.validation("Registration is not open for this tournament");
      }

      const now = new Date();
      if (tournament.registrationStart && now < tournament.registrationStart) {
        throw AppError.validation("Registration has not started yet.");
      }
      if (tournament.registrationDeadline && now > tournament.registrationDeadline) {
        throw AppError.validation("Registration is closed.");
      }

      const player = await tx.player.findUnique({ where: { userId } });
      if (!player) {
        throw AppError.validation("You must register as a player before registering for a tournament.");
      }
      if (tournament.requiresApprovedPlayer && player.status !== "APPROVED") {
        throw AppError.validation("An approved player registration is required for this tournament.");
      }

      const category = await tx.tournamentRegistrationCategory.findFirst({
        where: { id: categoryId, tournamentId, isActive: true },
      });
      if (!category || !Number.isInteger(category.fee) || category.fee < 0) {
        throw AppError.validation("This category is not available for registration.");
      }

      const existing = await tx.tournamentRegistration.findUnique({
        where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
      });
      if (existing) {
        throw AppError.conflict(
          existing.categoryId === categoryId
            ? "You are already registered for this category."
            : "You are already registered for this tournament."
        );
      }

      if (tournament.maxParticipants != null) {
        const occupied = await tx.tournamentRegistration.count({
          where: { tournamentId, status: { in: [...OCCUPYING_STATUSES] } },
        });
        if (occupied >= tournament.maxParticipants) {
          throw AppError.validation("Registration capacity has been reached.");
        }
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
