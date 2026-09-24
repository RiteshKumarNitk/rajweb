import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { UserRowActions } from "./user-row-actions";

interface SearchParams {
  q?: string;
  role?: string;
  district?: string;
  status?: string;
}

async function getUsers(filters: SearchParams) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.user.findMany({
      where: {
        ...(filters.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: "insensitive" } },
                { email: { contains: filters.q, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filters.role ? { role: { slug: filters.role } } : {}),
        ...(filters.district ? { districtId: filters.district } : {}),
        ...(filters.status === "active" ? { isActive: true } : {}),
        ...(filters.status === "inactive" ? { isActive: false } : {}),
      },
      include: { role: true, district: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

async function getFilterOptions() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [roles, districts] = await Promise.all([
      prisma.role.findMany({ orderBy: { name: "asc" } }),
      prisma.district.findMany({ orderBy: { name: "asc" } }),
    ]);
    return { roles, districts };
  } catch {
    return { roles: [], districts: [] };
  }
}

type UserWithRole = Awaited<ReturnType<typeof getUsers>>[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user: viewer } = await requireAdminScope(PERMISSIONS.USERS_READ);
  const filters = await searchParams;
  const [users, { roles, districts }] = await Promise.all([getUsers(filters), getFilterOptions()]);
  const canManage = hasPermission(viewer, PERMISSIONS.USERS_UPDATE);

  const columns: ColumnDef<UserWithRole>[] = [
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "Email", accessorKey: "email" },
    { header: "Role", cell: (u) => u.role.name },
    { header: "District", cell: (u) => u.district?.name || "—" },
    { header: "Provider", cell: (u) => u.authProvider },
    {
      header: "Status",
      cell: (u) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {u.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Last Login",
      cell: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN") : "Never"),
    },
    ...(canManage
      ? [
          {
            header: "Actions",
            cell: (u: UserWithRole) => (
              <UserRowActions
                userId={u.id}
                isActive={u.isActive}
                currentRoleId={u.roleId}
                currentDistrictId={u.districtId}
                currentIsFederationWide={u.isFederationWide}
                roles={roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))}
                districts={districts.map((d) => ({ id: d.id, name: d.name }))}
              />
            ),
          } satisfies ColumnDef<UserWithRole>,
        ]
      : []),
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Users</h1>
        <p className="text-slate-500">{users.length} system users</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-4">
            <Input name="q" placeholder="Search name or email" defaultValue={filters.q} />
            <select
              name="role"
              defaultValue={filters.role ?? ""}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              name="district"
              defaultValue={filters.district ?? ""}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">All districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm"
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm">
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DashboardCard title="All Users">
        <DataTable
          data={users}
          columns={columns}
          keyExtractor={(u) => u.id}
          emptyTitle="No users found"
        />
      </DashboardCard>
    </div>
  );
}
