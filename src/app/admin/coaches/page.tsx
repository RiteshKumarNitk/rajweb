import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

async function getCoaches(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.coach.findMany({
      where: districtId ? { districtId } : undefined,
      include: { district: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    return [];
  }
}

type CoachWithDistrict = Awaited<ReturnType<typeof getCoaches>>[number];

export default async function AdminCoachesPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.COACHES_READ);
  const coaches = await getCoaches(districtId);

  const columns: ColumnDef<CoachWithDistrict>[] = [
    { header: "Coach ID", accessorKey: "coachId", className: "font-mono text-xs" },
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "Level", cell: (c) => c.certificationLevel.replace("_", " ") },
    { header: "District", cell: (c) => c.district.name },
    {
      header: "Status",
      cell: (c) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            c.status === "APPROVED"
              ? "bg-green-100 text-green-700"
              : c.status === "PENDING"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {c.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Coaches</h1>
        <p className="text-slate-500">{coaches.length} registered coaches</p>
      </div>
      <DashboardCard title="All Coaches">
        <DataTable
          data={coaches}
          columns={columns}
          keyExtractor={(c) => c.id}
          emptyTitle="No coaches registered yet"
          emptyDescription="When coaches register, they will appear here."
        />
      </DashboardCard>
    </div>
  );
}
