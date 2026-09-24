import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, MapPin, Calendar } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
  title: "Tournaments",
  description: "Upcoming RRA tournaments and your tournament registrations.",
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
    prisma.player.findUnique({
      where: { userId: authUser.id },
      include: { tournamentRegistrations: { include: { tournament: true, category: true } } },
    }),
  ]);

  const registrations = player?.tournamentRegistrations ?? [];
  const registeredTournamentIds = new Set(registrations.map((registration) => registration.tournamentId));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary">Tournaments</h1>
        <p className="text-slate-500">Browse open tournaments and track your registrations.</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-primary">Upcoming Tournaments</h2>
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState title="No tournaments open right now" description="Check back soon for upcoming RRA tournaments." />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-accent" /> {t.name}
                  </CardTitle>
                  <StatusBadge status={t.status} label={formatTournamentStatus(t.status)} />
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatTournamentSchedule(t.startDate)} – {formatTournamentSchedule(t.endDate)}
                  </p>
                  {t.registrationDeadline && (
                    <p className="text-xs text-slate-400">Registration closes {formatTournamentSchedule(t.registrationDeadline)}</p>
                  )}
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {t.venue ?? "Venue TBA"} · {t.district?.name ?? "State-wide"}
                  </p>
                  {t.registrationCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {t.registrationCategories.map((c) => (
                        <span key={c.id} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {c.name}: {formatInr(c.fee)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <Link href={`/account/tournaments/${t.id}`} className="text-xs font-medium text-secondary hover:underline">
                      {t.status === "REGISTRATION_OPEN" && !registeredTournamentIds.has(t.id) ? "Register" : "View details"}
                    </Link>
                    <Link href={`/tournaments/${t.slug}`} className="text-xs font-medium text-slate-500 hover:underline">
                      Public page
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-primary">My Tournament Registrations</h2>
        <Card>
          <CardContent className="p-6">
            {registrations.length === 0 ? (
              <EmptyState
                title="No tournament registrations yet"
                description="Tournament registrations you submit will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {registrations.map((reg) => (
                  <li key={reg.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-primary">{reg.tournament.name}</p>
                      <p className="text-xs text-slate-500">{reg.category?.name ?? "Category"}</p>
                      <p className="text-xs text-slate-400">
                        Registration amount: {reg.amount != null ? formatInr(reg.amount) : "Not recorded"}
                        {" · "}
                        {formatDate(reg.registeredAt)}
                      </p>
                      <p className="font-mono text-[11px] text-slate-400">{reg.id}</p>
                    </div>
                    <StatusBadge status={reg.status} />
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
