import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDate } from "@/lib/utils";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

import { DashboardCard } from "@/shared/components/ui/dashboard-card";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";

async function getAuditLogs() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch {
    return [];
  }
}

type AuditLogWithUser = Awaited<ReturnType<typeof getAuditLogs>>[number];

export default async function AdminAuditLogsPage() {
  await requireAdminScope(PERMISSIONS.AUDIT_READ);
  const logs = await getAuditLogs();

  const columns: ColumnDef<AuditLogWithUser>[] = [
    {
      header: "Time",
      cell: (log) => formatDate(log.createdAt, { hour: "2-digit", minute: "2-digit" }),
      className: "whitespace-nowrap",
    },
    { header: "User", cell: (log) => log.user?.name || "System" },
    {
      header: "Action",
      cell: (log) => (
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium">
          {log.action}
        </span>
      ),
    },
    { header: "Module", accessorKey: "module" },
    { header: "Entity", cell: (log) => log.entityId || "—", className: "font-mono text-xs" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Audit Logs</h1>
        <p className="text-slate-500">System activity tracking</p>
      </div>
      <DashboardCard title="Recent Activity">
        <DataTable
          data={logs}
          columns={columns}
          keyExtractor={(log) => log.id}
          emptyTitle="No audit logs yet"
        />
      </DashboardCard>
    </div>
  );
}
