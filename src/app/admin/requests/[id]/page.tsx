import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, History, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/security/auth/session";
import { getDistrictWhereClause } from "@/security/rbac/district-scope";
import { hasPermission, PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { REQUEST_TYPE_LABELS } from "@/modules/requests/request-types";
import { RequestReviewActions } from "./request-review-actions";

export default async function AdminRequestReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user, PERMISSIONS.REQUESTS_VIEW)) {
    redirect("/admin?error=forbidden");
  }

  const districtWhere = getDistrictWhereClause(user);
  const serviceRequest = await prisma.request.findFirst({
    where: {
      id,
      ...(districtWhere.districtId
        ? { OR: [{ player: { districtId: districtWhere.districtId } }, { coach: { districtId: districtWhere.districtId } }] }
        : {}),
    },
    include: {
      user: true,
      player: { include: { district: true } },
      coach: { include: { district: true } },
      requestedDistrict: true,
    },
  });
  if (!serviceRequest) notFound();

  const canApprove = hasPermission(user, PERMISSIONS.REQUESTS_APPROVE);
  const profile = serviceRequest.player ?? serviceRequest.coach;
  const profileType = serviceRequest.playerId ? "Player" : "Coach";
  const profileLabel = serviceRequest.player
    ? `${serviceRequest.player.name} (${serviceRequest.player.playerId})`
    : serviceRequest.coach
      ? `${serviceRequest.coach.name} (${serviceRequest.coach.coachId})`
      : "—";

  const auditHistory = await prisma.auditLog.findMany({
    where: { entityId: id, module: "requests" },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <Link href="/admin/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Request Center
      </Link>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm font-medium text-primary">
          Admin Review Screen — actions taken here directly change the request&apos;s status
          {["CONTACT_UPDATE", "DISTRICT_CHANGE", "ADDRESS_UPDATE"].includes(serviceRequest.type)
            ? " and update the underlying record."
            : "."}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{REQUEST_TYPE_LABELS[serviceRequest.type]}</h1>
          <p className="font-mono text-sm text-slate-500">{serviceRequest.requestNumber}</p>
        </div>
        <StatusBadge status={serviceRequest.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">User:</span> <span className="font-medium">{serviceRequest.user.name}</span> ({serviceRequest.user.email})</p>
            <p><span className="text-slate-500">{profileType}:</span> <span className="font-medium">{profileLabel}</span></p>
            <p><span className="text-slate-500">District:</span> <span className="font-medium">{profile?.district.name}</span></p>
            <p><span className="text-slate-500">Submitted:</span> <span className="font-medium">{formatDate(serviceRequest.createdAt)}</span></p>

            <div className="mt-4 rounded-md bg-slate-50 p-3">
              <p className="mb-1 font-semibold text-primary">Reason</p>
              <p>{serviceRequest.reason}</p>
            </div>

            {serviceRequest.type === "CONTACT_UPDATE" && (
              <div className="mt-2 space-y-1">
                <p><span className="text-slate-500">Current Mobile:</span> <span className="font-medium">{profile?.mobile}</span></p>
                {serviceRequest.requestedMobile && (
                  <p><span className="text-slate-500">Requested Mobile:</span> <span className="font-medium text-accent">{serviceRequest.requestedMobile}</span></p>
                )}
                <p><span className="text-slate-500">Current Email:</span> <span className="font-medium">{profile?.email}</span></p>
                {serviceRequest.requestedEmail && (
                  <p><span className="text-slate-500">Requested Email:</span> <span className="font-medium text-accent">{serviceRequest.requestedEmail}</span></p>
                )}
              </div>
            )}

            {serviceRequest.type === "DISTRICT_CHANGE" && (
              <div className="mt-2 space-y-1">
                <p><span className="text-slate-500">Current District:</span> <span className="font-medium">{profile?.district.name}</span></p>
                <p><span className="text-slate-500">Requested District:</span> <span className="font-medium text-accent">{serviceRequest.requestedDistrict?.name}</span></p>
              </div>
            )}

            {serviceRequest.type === "ADDRESS_UPDATE" && serviceRequest.requestedAddress && (
              <div className="mt-2">
                <p><span className="text-slate-500">Requested Address:</span></p>
                <p className="font-medium">{serviceRequest.requestedAddress}</p>
              </div>
            )}

            {serviceRequest.requestedValue && !["CONTACT_UPDATE", "DISTRICT_CHANGE", "ADDRESS_UPDATE"].includes(serviceRequest.type) && (
              <div className="mt-2">
                <p className="text-slate-500">Details:</p>
                <p className="font-medium">{serviceRequest.requestedValue}</p>
              </div>
            )}

            <div className="mt-2 rounded-md bg-slate-50 p-3 text-slate-500">
              <p className="text-xs">No documents submitted with this request — document attachment is not yet supported.</p>
            </div>

            {serviceRequest.status === "REJECTED" && serviceRequest.rejectionReason && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-secondary">
                <span className="font-semibold">Rejection reason:</span> {serviceRequest.rejectionReason}
              </p>
            )}
            {serviceRequest.status === "APPROVED" && serviceRequest.adminRemarks && (
              <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-green-800">{serviceRequest.adminRemarks}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <RequestReviewActions id={id} status={serviceRequest.status} canApprove={canApprove} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-accent" /> Request History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-700">Request submitted</span>
              <span className="text-xs text-slate-400">{formatDate(serviceRequest.createdAt)}</span>
            </li>
            {auditHistory.map((entry) => {
              const details = entry.details && typeof entry.details === "object" ? (entry.details as { reason?: string }) : {};
              const label = entry.action === "APPROVE" ? "Approved" : entry.action === "REJECT" ? "Rejected" : entry.action;
              return (
                <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-700">
                    {label}
                    {entry.user?.name ? ` by ${entry.user.name}` : ""}
                    {details.reason ? ` — ${details.reason}` : ""}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
