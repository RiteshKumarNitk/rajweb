import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { UserRowActions } from "./user-row-actions";
import { Users, Shield, UserCheck, KeyRound, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const adminUsers = users.filter((u) => u.role.slug.includes("admin") || u.role.slug === "super_admin").length;
  const districtUsers = users.filter((u) => u.districtId !== null).length;

  const columns: ColumnDef<UserWithRole>[] = [
    {
      header: "User Details",
      cell: (u) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">{u.name || "Unnamed User"}</p>
          <p className="text-xs text-slate-400 font-mono">{u.email}</p>
        </div>
      ),
    },
    {
      header: "System Role",
      cell: (u) => {
        const isSuper = u.role.slug === "super_admin";
        const isAdmin = u.role.slug.includes("admin");
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
              isSuper
                ? "bg-purple-50 text-purple-800 border-purple-200"
                : isAdmin
                ? "bg-blue-50 text-blue-800 border-blue-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            <Shield className="h-3 w-3" /> {u.role.name}
          </span>
        );
      },
    },
    {
      header: "Jurisdiction",
      cell: (u) =>
        u.district?.name ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {u.district.name}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">Federation Wide</span>
        ),
    },
    {
      header: "Auth Provider",
      cell: (u) => (
        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          {u.authProvider}
        </span>
      ),
    },
    {
      header: "Account Status",
      cell: (u) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            u.isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
          {u.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      header: "Last Login",
      cell: (u) => (
        <span className="text-xs text-slate-500">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
        </span>
      ),
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">User Accounts &amp; Access</h1>
          <p className="text-sm text-slate-500">
            System identity management, role assignments, district scope restrictions, and security statuses.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Authenticated accounts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Accounts</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeUsers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Healthy login status</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Administrators</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{adminUsers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Shield className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Staff &amp; Executive access</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">District Scoped</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{districtUsers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Regional administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-semibold text-primary">Filter &amp; Query Users</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form method="get" className="grid gap-3 sm:grid-cols-4">
            <Input name="q" placeholder="Search by name or email..." defaultValue={filters.q} className="h-9 text-xs" />
            <select
              name="role"
              defaultValue={filters.role ?? ""}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              name="district"
              defaultValue={filters.district ?? ""}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-xs"
            >
              <option value="">Any Status</option>
              <option value="active">Active Accounts Only</option>
              <option value="inactive">Disabled Accounts Only</option>
            </select>
            <div className="sm:col-span-4 flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" className="h-8 text-xs bg-primary text-white hover:bg-slate-800">
                <Filter className="mr-1.5 h-3.5 w-3.5" /> Apply Filters
              </Button>
              <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-slate-500">
                <Link href="/admin/users">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users Main Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All System Users</CardTitle>
          <CardDescription className="text-xs">
            Manage user roles, district scoping, and account activations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={users}
            columns={columns}
            keyExtractor={(u) => u.id}
            emptyTitle="No users found"
            emptyDescription="No user accounts matched the filter query."
          />
        </CardContent>
      </Card>
    </div>
  );
}
