import type { Metadata } from "next";
import { MyTournamentsList } from "@/shared/components/account/my-tournaments-list";
import { listMyTournaments, parseMyTournamentQuery } from "@/modules/tournaments/my-tournaments.server";
import { requireOwnPlayer } from "../require-own-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Tournaments" };

/** Tournaments this player registered for — only the session player's own entries. */
export default async function PlayerTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { player } = await requireOwnPlayer();
  const query = parseMyTournamentQuery(await searchParams);
  const list = await listMyTournaments(player.id, query);
  return <MyTournamentsList list={list} query={query} basePath="/account/player/tournaments" />;
}
