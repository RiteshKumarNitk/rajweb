import Link from "next/link";
import { formatTournamentSchedule, formatTournamentStatus } from "@/modules/tournaments/tournament-dates";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { isFederationWide } from "@/security/rbac/district-scope";
import { AddTournamentButton } from "@/shared/components/admin/add-tournament-button";

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

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

  const columns: ColumnDef<TournamentData>[] = [
    { header: "Name", cell: (t) => <Link href={`/admin/tournaments/${t.id}`} className="font-medium text-primary hover:underline">{t.name}</Link> },
    { header: "Category", accessorKey: "category" },
    { header: "District", cell: (t) => t.district?.name ?? "State-wide" },
    { header: "Dates", cell: (t) => `${formatTournamentSchedule(t.startDate)} - ${formatTournamentSchedule(t.endDate)}` },
    { header: "Registrations", cell: (t) => t._count.registrations },
    {
      header: "Status",
      cell: (t) => (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {formatTournamentStatus(t.status)}
        </span>
      ),
    },
    {
      header: "",
      cell: (t) => (
        <Link href={`/admin/tournaments/${t.id}`} className="text-xs font-medium text-secondary hover:underline">
          Manage
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Tournaments</h1>
          <p className="text-slate-500">{tournaments.length} tournaments</p>
        </div>
        {canManage && (
          <AddTournamentButton districts={districts} lockedDistrictId={lockedDistrictId} />
        )}
      </div>
      <DashboardCard title="All Tournaments">
        <DataTable
          data={tournaments}
          columns={columns}
          keyExtractor={(t) => t.id}
          emptyTitle="No tournaments yet"
        />
      </DashboardCard>
    </div>
  );
}
