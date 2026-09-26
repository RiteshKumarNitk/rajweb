import Link from "next/link";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { isFederationWide } from "@/security/rbac/district-scope";
import { AddTournamentButton } from "@/shared/components/admin/add-tournament-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { Trophy, Calendar, Users, MapPin, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export const dynamic = "force-dynamic";

async function getTournaments(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.tournament.findMany({
      where: districtId ? { districtId } : undefined,
      include: { district: true, _count: { select: { registrations: true } } },
      orderBy: { startDate: "desc" },
    });
  } catch {
    return [];
  }
}

async function getDistricts(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.district.findMany({
      where: districtId ? { id: districtId } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  } catch {
    return [];
  }
}

type TournamentData = Awaited<ReturnType<typeof getTournaments>>[number];

export default async function AdminTournamentsPage() {
  const { districtId, user } = await requireAdminScope(PERMISSIONS.TOURNAMENTS_READ);
  const [tournaments, districts] = await Promise.all([getTournaments(districtId), getDistricts(districtId)]);
  const canManage = hasPermission(user, PERMISSIONS.TOURNAMENTS_MANAGE);
  const lockedDistrictId = !isFederationWide(user) ? user.districtId ?? undefined : undefined;

  const totalTournaments = tournaments.length;
  const openRegistrations = tournaments.filter((t) => t.status === "REGISTRATION_OPEN").length;
  const ongoingOrUpcoming = tournaments.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "REGISTRATION_OPEN" || t.status === "REGISTRATION_CLOSED"
  ).length;
  const totalEntries = tournaments.reduce((acc, t) => acc + t._count.registrations, 0);

  const columns: ColumnDef<TournamentData>[] = [
    {
      header: "Championship Name",
      cell: (t) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/tournaments/${t.id}`}
            className="font-bold text-slate-900 text-sm hover:text-primary hover:underline"
          >
            {t.name}
          </Link>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-red-500" />
            {t.venue ? `${t.venue}, ` : ""}{t.district?.name ?? "State-wide Event"}
          </p>
        </div>
      ),
    },
    {
      header: "Category",
      cell: (t) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {t.category}
        </span>
      ),
    },
    {
      header: "Schedule Dates",
      cell: (t) => (
        <div className="text-xs text-slate-700 flex items-center gap-1 font-medium">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          {formatTournamentSchedule(t.startDate)} – {formatTournamentSchedule(t.endDate)}
        </div>
      ),
    },
    {
      header: "Athlete Entries",
      cell: (t) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          <Users className="h-3 w-3 text-blue-600" />
          {t._count.registrations} Entries
        </span>
      ),
    },
    {
      header: "Status",
      cell: (t) => {
        const isLive = t.status === "REGISTRATION_OPEN" || t.status === "IN_PROGRESS";
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              isLive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {isLive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            {formatTournamentStatus(t.status)}
          </span>
        );
      },
    },
    {
      header: "Actions",
      cell: (t) => (
        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
          <Link href={`/admin/tournaments/${t.id}`}>Manage Draw</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">State Tournaments</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Sanctioned championships, entry deadlines, match fixtures, and tournament registrations.
          </p>
        </div>
        {canManage && <AddTournamentButton districts={districts} lockedDistrictId={lockedDistrictId} />}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Events</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalTournaments}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Sanctioned state tournaments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Registration Open</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{openRegistrations}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Accepting athlete entries</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active / Upcoming</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{ongoingOrUpcoming}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Scheduled on calendar</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Entries</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{totalEntries}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Player registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tournaments Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All Tournaments &amp; Events</CardTitle>
          <CardDescription className="text-xs">
            Manage registrations, match draws, rules, and live tournament statuses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={tournaments}
            columns={columns}
            keyExtractor={(t) => t.id}
            emptyTitle="No tournaments scheduled yet"
            emptyDescription="Create your first sanctioned tournament using the Add Tournament button above."
          />
        </CardContent>
      </Card>
    </div>
  );
}
