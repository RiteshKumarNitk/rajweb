import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { RequestsTable, type AdminRequestRow } from "./requests-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Inbox, Clock, CheckCircle2, RefreshCw, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.REQUESTS_VIEW);

  const requests = await prisma.request.findMany({
    where: districtId
      ? { OR: [{ player: { districtId } }, { coach: { districtId } }] }
      : undefined,
    select: {
      id: true,
      requestNumber: true,
      playerId: true,
      type: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      player: { select: { district: { select: { name: true } } } },
      coach: { select: { district: { select: { name: true } } } },
      requestedDistrict: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const rows: AdminRequestRow[] = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    userName: r.user.name,
    userEmail: r.user.email,
    profileType: r.playerId ? "player" : "coach",
    type: r.type,
    status: r.status,
    district: (r.player?.district ?? r.coach?.district)?.name ?? "—",
    requestedDistrict: r.requestedDistrict?.name ?? null,
    submittedAt: r.createdAt.toISOString(),
  }));

  const totalRequests = rows.length;
  const pendingRequests = rows.filter((r) => r.status === "PENDING").length;
  const districtTransfers = rows.filter((r) => r.type.includes("DISTRICT")).length;
  const completedRequests = rows.filter((r) => r.status === "APPROVED" || r.status === "RESOLVED").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Member Request Center</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Player and coach service tickets: district transfers, profile corrections, license reprints, and verification requests.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Requests</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalRequests}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Inbox className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">All submitted service tickets</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Review</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingRequests}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-amber-600 font-medium">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">District Transfers</p>
                <h3 className="text-2xl font-bold text-purple-600 mt-1">{districtTransfers}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Jurisdiction changes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Resolved</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{completedRequests}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Completed tickets</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All Service Requests</CardTitle>
          <CardDescription className="text-xs">
            Review request details, approve district migrations, and process official inquiries.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <RequestsTable requests={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
