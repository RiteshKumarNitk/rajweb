import { notFound, redirect } from "next/navigation";
import prisma from "@/infrastructure/database/prisma";
import { requireOwnPlayer } from "../../require-own-player";

export const dynamic = "force-dynamic";

/**
 * Older link to one of the player's entries: resolves it for the session
 * player only (another player's entry is a 404) and opens the tournament's
 * detail page, which shows the registration, player and certificate.
 */
export default async function PlayerTournamentEntryPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { player } = await requireOwnPlayer();
  const { registrationId } = await params;
  const entry = await prisma.tournamentRegistration.findFirst({
    where: { id: registrationId, playerId: player.id },
    select: { tournamentId: true },
  });
  if (!entry) notFound();
  redirect(`/account/tournaments/${entry.tournamentId}`);
}
