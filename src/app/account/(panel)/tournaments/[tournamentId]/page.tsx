import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy, Ticket, UserCheck, Award, Download, Eye } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/lib/utils";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { getOwnPlayer } from "@/modules/players/own-player.server";
import { registrationStatesFor } from "@/modules/tournaments/registration-eligibility.server";
import { effectiveRegistrationLabel, registrationWindow } from "@/modules/tournaments/registration-eligibility";
import { TournamentRegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournament Details",
  description: "Tournament details, your registration and your certificate.",
};

const ENTRY_LABELS: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", EXPIRED: "Expired" };

function Fields({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Read-only tournament view with the signed-in player's own registration and
 * certificate. Viewing does not depend on registration being open: a player
 * who registered can always open their tournament (closed, in progress,
 * completed or even cancelled). Others see published tournaments only.
 * Tournament status, the player's entry status and the certificate are kept
 * separate; nothing that is not stored (results, ranks) is shown.
 */
export default async function AccountTournamentDetailPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [tournament, player] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        venue: true,
        city: true,
        startDate: true,
        endDate: true,
        registrationStart: true,
        registrationDeadline: true,
        maxParticipants: true,
        requiresApprovedPlayer: true,
        district: { select: { name: true } },
        state: { select: { name: true } },
        registrationCategories: { where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, type: true, fee: true } },
      },
    }),
    getOwnPlayer(authUser.id),
  ]);
  if (!tournament) notFound();

  // The session player's own entry and certificate — never looked up by an id from the request.
  const [registration, certificate] = player
    ? await Promise.all([
        prisma.tournamentRegistration.findUnique({
          where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
          select: { id: true, status: true, amount: true, seed: true, registeredAt: true, category: { select: { name: true, type: true } } },
        }),
        prisma.playerCertificate.findFirst({
          where: { tournamentId, playerId: player.id, isRevoked: false },
          select: { id: true, certificateNumber: true, title: true, position: true, issuedAt: true },
        }),
      ])
    : [null, null];

  // Unpublished/cancelled tournaments stay hidden — unless this player is registered for it.
  if ((tournament.status === "DRAFT" || tournament.status === "CANCELLED") && !registration) notFound();

  const states = await registrationStatesFor([{ ...tournament, activeCategories: tournament.registrationCategories.length }], player);
  const state = states.get(tournament.id)!;
  const correctedLabel = effectiveRegistrationLabel(state.tournament, tournament.status);
  const { closesAt } = registrationWindow(tournament);
  const location = [tournament.venue, tournament.city].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-500 hover:text-primary">
        <Link href="/account/tournaments">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Tournaments
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-accent" /> {tournament.name}
              </CardTitle>
              <CardDescription className="font-mono text-xs">Code: {tournament.slug}</CardDescription>
            </div>
            <StatusBadge
              status={correctedLabel ? "REGISTRATION_CLOSED" : tournament.status}
              label={`Tournament: ${correctedLabel ?? formatTournamentStatus(tournament.status)}`}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tournament.description && <p className="text-sm leading-relaxed text-slate-600">{tournament.description}</p>}
          <Fields
            rows={[
              ["State", tournament.state?.name ?? "—"],
              ["District", tournament.district?.name ?? "State-wide"],
              ["Venue", location || "Venue TBA"],
              ["Starts", formatTournamentSchedule(tournament.startDate)],
              ["Ends", formatTournamentSchedule(tournament.endDate)],
              ["Tournament Status", formatTournamentStatus(tournament.status)],
              [
                "Registration",
                tournament.registrationDeadline
                  ? `${closesAt && closesAt <= new Date() ? "Closed" : "Closes"} ${formatTournamentSchedule(tournament.registrationDeadline)}`
                  : correctedLabel ?? (tournament.status === "REGISTRATION_OPEN" ? "Open" : "Closed"),
              ],
              ["Eligibility", tournament.requiresApprovedPlayer ? "Approved player registration" : "Player profile"],
              ...(tournament.maxParticipants ? ([["Capacity", `${tournament.maxParticipants} players`]] as Array<[string, React.ReactNode]>) : []),
            ]}
          />
          {tournament.registrationCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tournament.registrationCategories.map((c) => (
                <span key={c.id} className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                  {c.name} ({c.type === "SINGLES" ? "Singles" : "Doubles"}): {formatInr(c.fee)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {registration && player ? (
        <>
          <Card className="border-emerald-200" data-testid="my-registration">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="h-4 w-4 text-emerald-600" /> Your Registration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Fields
                rows={[
                  ["Registration Status", <StatusBadge key="s" status={registration.status} label={ENTRY_LABELS[registration.status] ?? registration.status} />],
                  ["Registered On", formatTournamentSchedule(registration.registeredAt)],
                  ["Category", registration.category ? `${registration.category.name} (${registration.category.type === "SINGLES" ? "Singles" : "Doubles"})` : "—"],
                  ["Registration Amount", registration.amount != null ? formatInr(registration.amount) : "Not on record"],
                  ["Seed", registration.seed != null ? String(registration.seed) : "Not assigned"],
                  ["Registration Reference", <span key="r" className="font-mono text-xs">{registration.id}</span>],
                ]}
              />
              <p className="mt-4 text-xs text-slate-500">Results and match scores appear here once the association records them.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4 text-accent" /> Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Fields
                rows={[
                  ["Player Name", player.name],
                  ["Player ID", <span key="p" className="font-mono">{player.playerId}</span>],
                  ["State", player.district.state?.name ?? "—"],
                  ["District", player.district.name],
                ]}
              />
            </CardContent>
          </Card>

          <Card data-testid="my-certificate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-accent" /> Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {certificate ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Fields
                    rows={[
                      ["Certificate", "Available"],
                      ["Certificate Number", <span key="n" className="font-mono">{certificate.certificateNumber}</span>],
                      ["Certificate Type", certificate.title ?? "Tournament Certificate"],
                      ["Issued", formatDate(certificate.issuedAt)],
                      ...(certificate.position ? ([["Achievement", certificate.position]] as Array<[string, React.ReactNode]>) : []),
                    ]}
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/account/player/certificates/${certificate.id}`}>
                        <Eye className="h-3.5 w-3.5" /> View Certificate
                      </Link>
                    </Button>
                    <Button size="sm" asChild>
                      <a href={`/api/certificates/${certificate.id}/pdf`}>
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">Certificate has not been issued yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4 text-blue-600" /> Tournament Entry
            </CardTitle>
            <CardDescription className="text-xs">Select your competitive category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {!player && (
              <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                <Link href="/account/player">Apply as Player →</Link>
              </Button>
            )}
            <TournamentRegisterForm
              tournamentId={tournament.id}
              categories={tournament.registrationCategories}
              disabledReason={state.player.open ? undefined : (state.player.message ?? "Registration is not available.")}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
