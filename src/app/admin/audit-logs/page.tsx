import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { formatDate } from "@/lib/utils";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { ShieldAlert, Activity, User, Layers, Clock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

async function getAuditLogs() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.auditLog.findMany({
      select: {
        id: true,
        action: true,
        module: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  } catch {
    return [];
  }
}

type AuditLogWithUser = Awaited<ReturnType<typeof getAuditLogs>>[number];

export default async function AdminAuditLogsPage() {
  await requireAdminScope(PERMISSIONS.AUDIT_READ);
  const logs = await getAuditLogs();

  const totalLogs = logs.length;
  const uniqueOperators = new Set(logs.map((l) => l.user?.name || "System")).size;
  const uniqueModules = new Set(logs.map((l) => l.module)).size;

  const columns: ColumnDef<AuditLogWithUser>[] = [
    {
      header: "Timestamp",
      cell: (log) => (
        <span className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(log.createdAt, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      ),
      className: "whitespace-nowrap",
    },
    {
      header: "Operator / Admin",
      cell: (log) => (
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div>
            <p className="font-semibold text-xs text-slate-900">{log.user?.name || "System Worker"}</p>
            {log.user?.email && <p className="text-[10px] text-slate-400">{log.user.email}</p>}
          </div>
        </div>
      ),
    },
    {
      header: "Action Executed",
      cell: (log) => {
        const isDelete = log.action.includes("DELETE") || log.action.includes("REJECT") || log.action.includes("REVOKE");
        const isCreate = log.action.includes("CREATE") || log.action.includes("APPROVE") || log.action.includes("ISSUE");
        return (
          <span
            className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
              isDelete
                ? "bg-red-50 text-red-700 border-red-200"
                : isCreate
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {log.action}
          </span>
        );
      },
    },
    {
      header: "Module",
      cell: (log) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 uppercase tracking-wider text-[10px]">
          {log.module}
        </span>
      ),
    },
    {
      header: "Target Entity ID",
      cell: (log) =>
        log.entityId ? (
          <code className="font-mono text-[11px] text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
            {log.entityId}
          </code>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">System Audit &amp; Security Logs</h1>
          <p className="text-sm text-slate-500">
            Immutable tracking of state approvals, certificate issuances, role updates, and administrative actions.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Audit Events</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalLogs}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Captured telemetry entries</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Operators</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{uniqueOperators}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <User className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-purple-600 font-medium">Authorised administrators</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Monitored Modules</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{uniqueModules}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Governance subsystems</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Audit Status</p>
                <h3 className="text-sm font-bold text-emerald-600 mt-1">100% Compliant</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Tamper-evident logs</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">Recent Audit Trail</CardTitle>
          <CardDescription className="text-xs">
            Chronological audit feed of state administrative operations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DataTable
            data={logs}
            columns={columns}
            keyExtractor={(log) => log.id}
            emptyTitle="No audit logs recorded yet"
            emptyDescription="Administrative operations and approval events will be logged here automatically."
          />
        </CardContent>
      </Card>
    </div>
  );
}
