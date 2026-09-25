import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, MapPin, Calendar, Clock, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { formatInr } from "@/modules/account/membership-pricing";
import {
  ACCOUNT_TOURNAMENT_STATUSES,
  formatTournamentSchedule,
  formatTournamentStatus,
} from "@/modules/tournaments/tournament-dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournaments & Championships",
  description: "Upcoming Rajasthan Racquetball state tournaments and your tournament registrations.",
};

export default async function AccountTournamentsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [tournaments, player] = await Promise.all([
    prisma.tournament.findMany({
      where: { status: { in: [...ACCOUNT_TOURNAMENT_STATUSES] } },
      include: { district: true, registrationCategories: { where: { isActive: true } } },
      orderBy: { startDate: "asc" },
    }),
    prisma.player.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { tournamentRegistrations: { include: { tournament: true, category: true } } },
    }),
  ]);

  const registrations = player?.tournamentRegistrations ?? [];
  const registeredTournamentIds = new Set(registrations.map((registration) => registration.tournamentId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Tournaments & Championships</h1>
        <p className="text-sm text-slate-500">
          Browse sanctioned state championships, view match schedules, and track your entries.
        </p>
      </div>

      {/* Upcoming Tournaments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-primary">Open State Tournaments</h2>
          </div>
          <span className="text-xs font-medium text-slate-500">{tournaments.length} Event(s)</span>
        </div>

        {tournaments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8">
              <EmptyState
                title="No open tournaments right now"
                description="Upcoming state and district championships will be published here once announced by the association."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((t) => {
              const isRegistered = registeredTournamentIds.has(t.id);
              return (
                <Card
                  key={t.id}
                  className="overflow-hidden border-slate-200/80 transition-all hover:border-red-300 hover:shadow-md"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base text-primary leading-snug">{t.name}</CardTitle>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          {t.venue ?? "Venue TBA"} · {t.district?.name ?? "State-wide"}
                        </p>
                      </div>
                      <StatusBadge status={t.status} label={formatTournamentStatus(t.status)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-600">
                    <div className="rounded-lg bg-slate-50 p-2.5 space-y-1 border border-slate-100">
                      <p className="flex items-center gap-2 font-medium text-slate-800">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        {formatTournamentSchedule(t.startDate)} – {formatTournamentSchedule(t.endDate)}
                      </p>
                      {t.registrationDeadline && (
                        <p className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3 shrink-0" />
                          Registration closes {formatTournamentSchedule(t.registrationDeadline)}
                        </p>
                      )}
                    </div>

                    {t.registrationCategories.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Categories & Entry Fees
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {t.registrationCategories.map((c) => (
                            <span
                              key={c.id}
                              className="rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-slate-800 border border-accent/20"
                            >
                              {c.name}: {formatInr(c.fee)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Link
                        href={`/tournaments/${t.slug}`}
                        className="text-xs text-slate-500 hover:text-primary transition-colors"
                      >
                        Public Event Page
                      </Link>

                      {isRegistered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                        </span>
                      ) : (
                        <Button size="sm" asChild className="h-8 text-xs bg-primary text-white hover:bg-slate-800">
                          <Link href={`/account/tournaments/${t.id}`}>
                            {t.status === "REGISTRATION_OPEN" ? "Register Now" : "View Details"}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* My Registrations Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-primary">My Tournament Registrations</h2>
        <Card>
          <CardContent className="p-6">
            {registrations.length === 0 ? (
              <EmptyState
                title="No tournament registrations yet"
                description="Tournaments you register for will appear here with payment status and entry details."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {registrations.map((reg) => (
                  <li key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-primary">{reg.tournament.name}</p>
                      <p className="text-xs text-slate-500">Category: {reg.category?.name ?? "All Categories"}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span>Fee: {reg.amount != null ? formatInr(reg.amount) : "N/A"}</span>
                        <span>·</span>
                        <span>Registered on {formatDate(reg.registeredAt)}</span>
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                          ID: {reg.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                    <div className="self-start sm:self-center">
                      <StatusBadge status={reg.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
