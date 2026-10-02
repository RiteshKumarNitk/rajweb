import { cache } from "react";
import prisma from "@/infrastructure/database/prisma";

/**
 * The signed-in user's own Player record — always resolved from the session
 * user id, never from an id the client sends. Explicit columns, so a page
 * never fails because of an unrelated column. Cached per request.
 */
export const getOwnPlayer = cache(async (userId: string | null | undefined) => {
  if (!userId) return null;
  return prisma.player.findUnique({
    where: { userId },
    select: {
      id: true,
      playerId: true,
      name: true,
      dateOfBirth: true,
      gender: true,
      email: true,
      mobile: true,
      photo: true,
      category: true,
      status: true,
      approvedAt: true,
      rejectionReason: true,
      expiresAt: true,
      createdAt: true,
      districtId: true,
      governmentIdType: true,
      governmentIdNumber: true,
      governmentIdDocumentId: true,
      district: { select: { id: true, name: true, stateId: true, state: { select: { id: true, name: true } } } },
    },
  });
});

export type OwnPlayer = NonNullable<Awaited<ReturnType<typeof getOwnPlayer>>>;

/** Summary numbers for the player area — counted from the database. */
export const getOwnPlayerCounts = cache(async (playerId: string) => {
  const [tournaments, certificates, pendingRequests] = await Promise.all([
    prisma.tournamentRegistration.count({ where: { playerId } }),
    prisma.playerCertificate.count({ where: { playerId, isRevoked: false } }),
    prisma.request.count({ where: { playerId, status: "PENDING" } }),
  ]);
  return { tournaments, certificates, pendingRequests };
});
