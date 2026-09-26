import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Calendar,
  MapPin,
  Trophy,
  ArrowLeft,
  Clock,
  Users,
  ShieldCheck,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Award,
} from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { TournamentRegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournament Registration & Entry Pass",
  description: "Official entry details and registration portal for Rajasthan Racquetball State Championships.",
};

export default async function AccountTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      district: true,
      registrationCategories: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!tournament || tournament.status === "DRAFT" || tournament.status === "CANCELLED") notFound();

  const player = await prisma.player.findUnique({
    where: { userId: authUser.id },
    include: {
      tournamentRegistrations: {
        where: { tournamentId },
        include: { category: true },
      },
    },
  });
  const registration = player?.tournamentRegistrations[0];
  const place = [tournament.venue, tournament.city, tournament.district?.name ?? "State-wide"].filter(Boolean).join(" · ");

  let disabledReason: string | undefined;
  if (!player) {
    disabledReason = "You must register as a player before registering for a tournament.";
  } else if (tournament.requiresApprovedPlayer && player.status !== "APPROVED") {
    disabledReason = "An approved player registration is required for this tournament.";
  } else if (tournament.status !== "REGISTRATION_OPEN") {
    disabledReason = "Registration is not open for this tournament.";
  } else if (tournament.registrationStart && new Date() < tournament.registrationStart) {
    disabledReason = "Registration has not started yet.";
  } else if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
    disabledReason = "Registration is closed.";
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-slate-500 hover:text-primary">
          <Link href="/account/tournaments">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Tournaments
          </Link>
        </Button>
      </div>

      {/* Tournament Hero Banner */}
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-red-500/60 bg-slate-800 text-2xl font-bold text-red-400 shadow-md sm:h-18 sm:w-18">
                <Trophy className="h-8 w-8 text-amber-400" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold sm:text-2xl">{tournament.name}</h1>
                  <StatusBadge status={tournament.status} label={formatTournamentStatus(tournament.status)} />
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-red-400" /> {place}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded text-slate-200 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    {formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}
                  </span>
                  {tournament.maxParticipants && (
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded text-slate-200">
                      <Users className="h-3.5 w-3.5" /> Max {tournament.maxParticipants} players
                    </span>
                  )}
                </div>
              </div>
            </div>

            {tournament.slug && (
              <Button variant="outline" size="sm" asChild className="self-start sm:self-auto border-white/20 bg-white/5 text-white hover:bg-white/10 text-xs">
                <Link href={`/tournaments/${tournament.slug}`} target="_blank">
                  Public Event Page →
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Event Overview & Schedule */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Tournament Overview</CardTitle>
                  <CardDescription className="text-xs">Schedule, guidelines, and venue logistics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {tournament.description && (
                <p className="text-slate-600 leading-relaxed text-sm">{tournament.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Championship Dates</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-red-500" />
                    {formatTournamentSchedule(tournament.startDate)} – {formatTournamentSchedule(tournament.endDate)}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Registration Window</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {tournament.registrationDeadline
                      ? `Closes ${formatTournamentSchedule(tournament.registrationDeadline)}`
                      : "Open for entries"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Host District</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    {tournament.district?.name ?? "All Rajasthan Districts"}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Eligibility Requirement</p>
                  <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {tournament.requiresApprovedPlayer ? "Approved Player License" : "Basic Player Profile"}
                  </p>
                </div>
              </div>

              {/* Event Categories */}
              {tournament.registrationCategories.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-slate-700 font-bold text-xs uppercase tracking-wider">
                    Official Competition Categories &amp; Fees
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {tournament.registrationCategories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 text-xs">{c.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{c.type.toLowerCase()} Draw</p>
                        </div>
                        <span className="font-bold text-xs text-primary bg-slate-100 px-2 py-1 rounded">
                          {formatInr(c.fee)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Registration / Entry Pass */}
        <div>
          {registration ? (
            <Card className="overflow-hidden border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white shadow-md">
              <div className="h-2 w-full bg-emerald-500" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <Ticket className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-emerald-950">Official Entry Pass</CardTitle>
                      <CardDescription className="text-xs text-emerald-700">Entry Confirmed</CardDescription>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Confirmed
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs">
                <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Athlete Name:</span>
                    <span className="font-bold text-slate-800">{player?.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Registered Category:</span>
                    <span className="font-semibold text-primary">{registration.category?.name ?? "Draw Entry"}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Entry Reference ID:</span>
                    <span className="font-mono font-bold text-slate-700 text-[11px]">{registration.id}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400">Registration Fee:</span>
                    <span className="font-bold text-emerald-700">
                      {registration.amount != null ? formatInr(registration.amount) : "Paid"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-600">{formatTournamentSchedule(registration.registeredAt)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800 text-[11px] flex items-start gap-2 border border-emerald-200/50">
                  <Award className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p>
                    Please present this official registration ID or your Player digital certificate at the tournament check-in desk.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200/80 shadow-md">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Ticket className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Tournament Entry</CardTitle>
                    <CardDescription className="text-xs">Select your competitive category</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {!player && (
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Player Profile Required</p>
                      <p className="text-[11px] mt-0.5">
                        You must create your athlete profile before submitting tournament entries.
                      </p>
                      <Button size="sm" variant="outline" asChild className="mt-2 text-xs h-7 bg-white">
                        <Link href="/account/player">Create Player Profile →</Link>
                      </Button>
                    </div>
                  </div>
                )}

                <TournamentRegisterForm
                  tournamentId={tournament.id}
                  categories={tournament.registrationCategories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    type: category.type,
                    fee: category.fee,
                  }))}
                  disabledReason={disabledReason}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
