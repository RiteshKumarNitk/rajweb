import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Award } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { requireOwnPlayer } from "../../require-own-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tournament Entry" };

/**
 * One of the player's own tournament entries. The registration is looked up
 * together with the session player's id, so another player's entry is a 404.
 * Only stored information is shown — no results, ranks or medals are invented.
 */
export default async function PlayerTournamentEntryPage({ params }: { params: Promise<{ registrationId: string }> }) {
  const { player } = await requireOwnPlayer();
  const { registrationId } = await params;

  const entry = await prisma.tournamentRegistration.findFirst({
    where: { id: registrationId, playerId: player.id },
    select: {
      id: true,
      status: true,
      amount: true,
      seed: true,
      registeredAt: true,
      category: { select: { name: true, type: true } },
      tournament: {
        select: {
          id: true,
          name: true,
          status: true,
          venue: true,
          city: true,
          startDate: true,
          endDate: true,
          district: { select: { name: true } },
          state: { select: { name: true } },
        },
      },
    },
  });
  if (!entry) notFound();

  const certificate = await prisma.playerCertificate.findFirst({
    where: { playerId: player.id, tournamentId: entry.tournament.id },
    select: { id: true, certificateNumber: true, title: true, position: true, isRevoked: true },
  });

  const rows: Array<[string, React.ReactNode]> = [
    ["Tournament", entry.tournament.name],
    ["State", entry.tournament.state?.name ?? "—"],
    ["District", entry.tournament.district?.name ?? "State-wide"],
    ["Venue", [entry.tournament.venue, entry.tournament.city].filter(Boolean).join(", ") || "—"],
    ["Starts", formatTournamentSchedule(entry.tournament.startDate)],
    ["Ends", formatTournamentSchedule(entry.tournament.endDate)],
    ["Category", entry.category ? `${entry.category.name} (${entry.category.type === "SINGLES" ? "Singles" : "Doubles"})` : "—"],
    ["Registration Status", <StatusBadge key="r" status={entry.status} />],
    ["Tournament Status", <StatusBadge key="t" status={entry.tournament.status} label={formatTournamentStatus(entry.tournament.status)} />],
    ["Registered On", formatTournamentSchedule(entry.registeredAt)],
    ["Registration Amount", entry.amount != null ? formatInr(entry.amount) : "Not on record"],
    ["Seed", entry.seed != null ? String(entry.seed) : "Not assigned"],
    ["Entry Reference", <span key="id" className="font-mono text-xs">{entry.id}</span>],
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-500 hover:text-primary">
        <Link href="/account/player/tournaments">
          <ArrowLeft className="h-3.5 w-3.5" /> My Tournaments
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-accent" /> {entry.tournament.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-slate-500">Results and match scores are shown here once the association records them.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-accent" /> Certificate
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {certificate && !certificate.isRevoked ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{certificate.title ?? "Tournament Certificate"}</p>
                <p className="font-mono text-xs text-slate-500">{certificate.certificateNumber}</p>
                {certificate.position && <p className="text-xs text-slate-600">Achievement: {certificate.position}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/account/player/certificates/${certificate.id}`}>View</Link>
                </Button>
                <Button size="sm" asChild>
                  <a href={`/api/certificates/${certificate.id}/pdf`}>Download PDF</a>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">No certificate has been issued for this tournament yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
