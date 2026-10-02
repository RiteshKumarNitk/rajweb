import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Award, ChevronRight } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { requireOwnPlayer } from "../require-own-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Tournaments" };

/** Tournaments this player registered for — only the session player's own entries. */
export default async function PlayerTournamentsPage() {
  const { player } = await requireOwnPlayer();

  const [registrations, certificates] = await Promise.all([
    prisma.tournamentRegistration.findMany({
      where: { playerId: player.id },
      select: {
        id: true,
        status: true,
        registeredAt: true,
        category: { select: { name: true } },
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            district: { select: { name: true } },
            state: { select: { name: true } },
          },
        },
      },
      orderBy: { registeredAt: "desc" },
    }),
    prisma.playerCertificate.findMany({
      where: { playerId: player.id, tournamentId: { not: null } },
      select: { id: true, tournamentId: true, certificateNumber: true, isRevoked: true },
    }),
  ]);
  const certificateByTournament = new Map(certificates.map((c) => [c.tournamentId, c]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-accent" /> My Tournaments
          </CardTitle>
          <CardDescription className="text-xs">Tournaments you registered for</CardDescription>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href="/account/tournaments">Browse Tournaments</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <EmptyState title="No tournament registrations yet" description="Tournaments you register for appear here." />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="my-tournaments">
            {registrations.map((r) => {
              const certificate = certificateByTournament.get(r.tournament.id);
              return (
                <li key={r.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-primary">{r.tournament.name}</p>
                    <p className="text-xs text-slate-500">
                      {[r.tournament.district?.name, r.tournament.state?.name].filter(Boolean).join(" · ") || "State-wide"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatTournamentSchedule(r.tournament.startDate)} – {formatTournamentSchedule(r.tournament.endDate)}
                    </p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p>
                      <span className="text-slate-400">Category:</span> {r.category?.name ?? "—"}
                    </p>
                    <p>
                      <span className="text-slate-400">Registered:</span> {formatDate(r.registeredAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <StatusBadge status={r.status} label={`Entry: ${r.status.charAt(0)}${r.status.slice(1).toLowerCase()}`} />
                    <StatusBadge status={r.tournament.status} label={formatTournamentStatus(r.tournament.status)} />
                    {certificate && !certificate.isRevoked && (
                      <Link
                        href={`/account/player/certificates/${certificate.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                      >
                        <Award className="h-3.5 w-3.5" /> Certificate
                      </Link>
                    )}
                  </div>
                  <Button size="sm" variant="outline" asChild className="justify-self-start md:justify-self-end">
                    <Link href={`/account/player/tournaments/${r.id}`}>
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
