import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Calendar, Clock, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { getOwnPlayer } from "@/modules/players/own-player.server";
import { registrationStatesFor } from "@/modules/tournaments/registration-eligibility.server";
import { effectiveRegistrationLabel } from "@/modules/tournaments/registration-eligibility";
import { listMyTournaments, parseMyTournamentQuery } from "@/modules/tournaments/my-tournaments.server";
import { MyTournamentsList } from "@/shared/components/account/my-tournaments-list";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Your tournament entries, and Rajasthan Racquetball tournaments open for registration.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const OPEN_PAGE_SIZE = 10;

export default async function AccountTournamentsPage({ searchParams }: { searchParams: SearchParams }) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const params = await searchParams;
  const view = params.view === "open" ? "open" : "mine";
  const player = await getOwnPlayer(authUser.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Tournaments</h1>
        <p className="text-sm text-slate-500">Tournaments you registered for, and championships currently open for entries.</p>
      </div>

      <nav className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs" aria-label="Tournament views">
        {[
          { key: "mine", label: "My Tournaments", href: "/account/tournaments" },
          { key: "open", label: "Open for Registration", href: "/account/tournaments?view=open" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={view === t.key ? "page" : undefined}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-semibold",
              view === t.key ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 hover:text-primary"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {view === "mine" ? <MyTournaments player={player} params={params} /> : <OpenTournaments player={player} params={params} />}
    </div>
  );
}

async function MyTournaments({ player, params }: { player: Awaited<ReturnType<typeof getOwnPlayer>>; params: Awaited<SearchParams> }) {
  if (!player) {
    return (
      <Card>
        <CardContent className="p-8">
          <EmptyState
            title="You have not registered for any tournaments yet."
            description="Tournament entries need a Player registration. Apply from the Player area, then register for an open tournament."
          />
        </CardContent>
      </Card>
    );
  }
  const query = parseMyTournamentQuery(params);
  const list = await listMyTournaments(player.id, query);
  return <MyTournamentsList list={list} query={query} basePath="/account/tournaments" />;
}

async function OpenTournaments({ player, params }: { player: Awaited<ReturnType<typeof getOwnPlayer>>; params: Awaited<SearchParams> }) {
  const q = (Array.isArray(params.q) ? params.q[0] : (params.q ?? "")).trim().slice(0, 100);
  const page = Math.max(1, Math.floor(Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1));
  const where: Prisma.TournamentWhereInput = {
    status: "REGISTRATION_OPEN",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase(), mode: "insensitive" } }] } : {}),
  };
  const [total, tournaments] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.tournament.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        venue: true,
        startDate: true,
        endDate: true,
        registrationStart: true,
        registrationDeadline: true,
        maxParticipants: true,
        requiresApprovedPlayer: true,
        district: { select: { name: true } },
        state: { select: { name: true } },
        registrationCategories: { where: { isActive: true }, select: { id: true, name: true, fee: true } },
      },
      orderBy: { startDate: "asc" },
      skip: (page - 1) * OPEN_PAGE_SIZE,
      take: OPEN_PAGE_SIZE,
    }),
  ]);
  const states = await registrationStatesFor(
    tournaments.map((t) => ({ ...t, activeCategories: t.registrationCategories.length })),
    player
  );
  const pages = Math.max(1, Math.ceil(total / OPEN_PAGE_SIZE));
  const link = (p: number) => `/account/tournaments?view=open${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-4">
      <form method="get" action="/account/tournaments" className="flex gap-2" role="search">
        <input type="hidden" name="view" value="open" />
        <label className="relative flex-1">
          <span className="sr-only">Search open tournaments</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or code"
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <Button type="submit" size="sm" className="h-10">
          Search
        </Button>
      </form>

      {tournaments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8">
            <EmptyState title="No tournaments are open for registration right now." description="Upcoming championships appear here once the association opens entries." />
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * OPEN_PAGE_SIZE + 1}–{Math.min(total, page * OPEN_PAGE_SIZE)} of {total}
          </p>
          <div className="grid gap-4 sm:grid-cols-2" data-testid="open-tournaments">
            {tournaments.map((t) => {
              const state = states.get(t.id);
              const corrected = state ? effectiveRegistrationLabel(state.tournament, t.status) : null;
              const canRegister = Boolean(state?.player.open);
              const registered = state?.player.block === "ALREADY_REGISTERED";
              return (
                <Card key={t.id} className="overflow-hidden border-slate-200/80" data-tournament={t.name}>
                  <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-snug text-primary">{t.name}</CardTitle>
                        <p className="font-mono text-[11px] text-slate-400">Code: {t.slug}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
                          {[t.venue ?? "Venue TBA", t.district?.name ?? "State-wide", t.state?.name].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <StatusBadge status={corrected ? "REGISTRATION_CLOSED" : t.status} label={corrected ?? formatTournamentStatus(t.status)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-600">
                    <div className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                      <p className="flex items-center gap-2 font-medium text-slate-800">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                        {formatTournamentSchedule(t.startDate)} – {formatTournamentSchedule(t.endDate)}
                      </p>
                      {t.registrationDeadline && (
                        <p className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3 shrink-0" /> Registration closes {formatTournamentSchedule(t.registrationDeadline)}
                        </p>
                      )}
                    </div>
                    {t.registrationCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.registrationCategories.map((c) => (
                          <span key={c.id} className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                            {c.name}: {formatInr(c.fee)}
                          </span>
                        ))}
                      </div>
                    )}
                    {!canRegister && !registered && state?.player.message && (
                      <p className="rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600" data-testid="registration-reason">
                        {state.player.message}
                      </p>
                    )}
                    <div className="flex justify-end border-t border-slate-100 pt-2">
                      <Button size="sm" asChild className="h-8 text-xs" variant={canRegister ? "default" : "outline"}>
                        <Link href={`/account/tournaments/${t.id}`}>{canRegister ? "Register Now" : registered ? "View My Entry" : "View Details"}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {pages > 1 && (
            <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
              {page > 1 && (
                <Link href={link(page - 1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                  Previous
                </Link>
              )}
              <span className="text-xs text-slate-500">
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={link(page + 1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
