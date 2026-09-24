import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

type MembershipRow = {
  id: string;
  membershipId: string;
  name: string;
  district: string;
  status: string;
};

async function getMemberships(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const where = districtId ? { districtId } : undefined;
    const [clubs, schools, academies] = await Promise.all([
      prisma.clubMembership.findMany({ where, include: { district: true }, orderBy: { createdAt: "desc" } }),
      prisma.schoolMembership.findMany({ where, include: { district: true }, orderBy: { createdAt: "desc" } }),
      prisma.academyMembership.findMany({ where, include: { district: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return {
      clubs: clubs.map((c) => ({
        id: c.id,
        membershipId: c.membershipId,
        name: c.clubName,
        district: c.district.name,
        status: c.status,
      })),
      schools: schools.map((s) => ({
        id: s.id,
        membershipId: s.membershipId,
        name: s.schoolName,
        district: s.district.name,
        status: s.status,
      })),
      academies: academies.map((a) => ({
        id: a.id,
        membershipId: a.membershipId,
        name: a.academyName,
        district: a.district.name,
        status: a.status,
      })),
    };
  } catch {
    return { clubs: [], schools: [], academies: [] };
  }
}

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

function MembershipTable({ title, rows }: { title: string; rows: MembershipRow[] }) {
  const columns: ColumnDef<MembershipRow>[] = [
    { header: "ID", accessorKey: "membershipId", className: "font-mono text-xs" },
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "District", accessorKey: "district" },
    {
      header: "Status",
      cell: (item) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            item.status === "APPROVED" || item.status === "ACTIVE"
              ? "bg-green-100 text-green-700"
              : item.status === "PENDING"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <DashboardCard title={`${title} (${rows.length})`}>
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(item) => item.id}
        emptyTitle="No applications yet"
      />
    </DashboardCard>
  );
}

export default async function AdminMembershipsPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.MEMBERSHIPS_READ);
  const { clubs, schools, academies } = await getMemberships(districtId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Memberships</h1>
        <p className="text-slate-500">Manage club, school, and academy memberships</p>
      </div>
      <div className="space-y-8">
        <MembershipTable title="Club Memberships" rows={clubs} />
        <MembershipTable title="School Memberships" rows={schools} />
        <MembershipTable title="Academy Memberships" rows={academies} />
      </div>
    </div>
  );
}
