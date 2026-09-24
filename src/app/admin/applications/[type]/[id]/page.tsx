import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, FileText, History, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/security/auth/session";
import { getDistrictWhereClause } from "@/security/rbac/district-scope";
import { hasPermission, PERMISSIONS, type PermissionSlug } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { isMembershipReviewType, type MembershipReviewType } from "@/modules/memberships/membership-review.server";
import { ApplicationReviewActions } from "./application-review-actions";

type ApplicationType = "player" | "coach" | MembershipReviewType;

const READ_PERMISSION: Record<ApplicationType, PermissionSlug> = {
  player: PERMISSIONS.PLAYERS_READ,
  coach: PERMISSIONS.COACHES_READ,
  club: PERMISSIONS.MEMBERSHIPS_READ,
  school: PERMISSIONS.MEMBERSHIPS_READ,
  academy: PERMISSIONS.MEMBERSHIPS_READ,
};

const APPROVE_PERMISSION: Record<ApplicationType, PermissionSlug> = {
  player: PERMISSIONS.PLAYERS_APPROVE,
  coach: PERMISSIONS.COACHES_APPROVE,
  club: PERMISSIONS.MEMBERSHIPS_APPROVE,
  school: PERMISSIONS.MEMBERSHIPS_APPROVE,
  academy: PERMISSIONS.MEMBERSHIPS_APPROVE,
};

const AUDIT_MODULE: Record<ApplicationType, string> = {
  player: "players",
  coach: "coaches",
  club: "memberships",
  school: "memberships",
  academy: "memberships",
};

const TYPE_LABELS: Record<ApplicationType, string> = {
  player: "Player Application",
  coach: "Coach Application",
  club: "Club Membership Application",
  school: "School Membership Application",
  academy: "Academy Membership Application",
};

function isApplicationType(value: string): value is ApplicationType {
  return value === "player" || value === "coach" || isMembershipReviewType(value);
}

async function loadRecord(type: ApplicationType, id: string, districtWhere: { districtId?: string }) {
  switch (type) {
    case "player":
      return prisma.player.findFirst({
        where: { id, ...districtWhere },
        include: {
          district: true,
          certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
        },
      });
    case "coach":
      return prisma.coach.findFirst({
        where: { id, ...districtWhere },
        include: {
          district: true,
          certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
        },
      });
    case "club":
      return prisma.clubMembership.findFirst({ where: { id, ...districtWhere }, include: { district: true } });
    case "school":
      return prisma.schoolMembership.findFirst({ where: { id, ...districtWhere }, include: { district: true } });
    case "academy":
      return prisma.academyMembership.findFirst({ where: { id, ...districtWhere }, include: { district: true } });
  }
}

function applicantName(type: ApplicationType, record: NonNullable<Awaited<ReturnType<typeof loadRecord>>>): string {
  switch (type) {
    case "player":
    case "coach":
      return (record as { name: string }).name;
    case "club":
      return (record as { clubName: string }).clubName;
    case "school":
      return (record as { schoolName: string }).schoolName;
    case "academy":
      return (record as { academyName: string }).academyName;
  }
}

function applicationCode(type: ApplicationType, record: NonNullable<Awaited<ReturnType<typeof loadRecord>>>): string {
  return type === "player" || type === "coach"
    ? (record as { playerId?: string; coachId?: string }).playerId ?? (record as { coachId: string }).coachId
    : (record as { membershipId: string }).membershipId;
}

export default async function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type: rawType, id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isApplicationType(rawType)) notFound();
  const type = rawType;

  if (!hasPermission(user, READ_PERMISSION[type])) {
    redirect("/admin?error=forbidden");
  }

  const districtWhere = getDistrictWhereClause(user);
  const record = await loadRecord(type, id, districtWhere);
  if (!record) notFound();

  const canApprove = hasPermission(user, APPROVE_PERMISSION[type]);
  const storage = getStorage();

  const auditHistory = await prisma.auditLog.findMany({
    where: { entityId: id, module: AUDIT_MODULE[type] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const documentPath =
    type === "player" || type === "coach"
      ? (record as { photo: string | null }).photo
      : (record as { certificatePath: string | null }).certificatePath;

  const district = (record as { district: { name: string } }).district.name;
  const status = (record as { status: string }).status;
  const email = (record as { email: string }).email;
  const mobile = (record as { mobile: string }).mobile;
  const createdAt = (record as { createdAt: Date }).createdAt;
  const approvedAt = (record as { approvedAt: Date | null }).approvedAt;
  const rejectionReason = (record as { rejectionReason: string | null }).rejectionReason;

  return (
    <div>
      <Link href="/admin/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Application Review Center
      </Link>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm font-medium text-primary">
          Admin Review Screen — actions taken here directly change the applicant&apos;s status.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{TYPE_LABELS[type]}</h1>
          <p className="font-mono text-sm text-slate-500">{applicationCode(type, record)}</p>
        </div>
        <StatusBadge status={status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{applicantName(type, record)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-slate-500">Email:</span> <span className="font-medium">{email}</span></p>
            <p><span className="text-slate-500">Mobile:</span> <span className="font-medium">{mobile}</span></p>
            <p><span className="text-slate-500">District:</span> <span className="font-medium">{district}</span></p>

            {type === "player" && (
              <>
                <p><span className="text-slate-500">Gender:</span> <span className="font-medium">{(record as { gender: string }).gender}</span></p>
                {(record as { category: string | null }).category && (
                  <p><span className="text-slate-500">Playing Category:</span> <span className="font-medium">{(record as { category: string | null }).category}</span></p>
                )}
                <p><span className="text-slate-500">Date of Birth:</span> <span className="font-medium">{formatDate((record as { dateOfBirth: Date }).dateOfBirth)}</span></p>
              </>
            )}

            {type === "coach" && (
              <>
                <p><span className="text-slate-500">Qualification:</span> <span className="font-medium">{(record as { qualification: string }).qualification}</span></p>
                <p><span className="text-slate-500">Certification Level:</span> <span className="font-medium">{(record as { certificationLevel: string }).certificationLevel.replace(/_/g, " ")}</span></p>
              </>
            )}

            {type === "club" && (
              <>
                <p><span className="text-slate-500">Authorized Person:</span> <span className="font-medium">{(record as { contactPerson: string }).contactPerson}</span></p>
                <p><span className="text-slate-500">Address:</span> <span className="font-medium">{(record as { address: string }).address}</span></p>
                <p><span className="text-slate-500">Number of Courts:</span> <span className="font-medium">{(record as { numberOfCourts: number }).numberOfCourts}</span></p>
              </>
            )}

            {type === "school" && (
              <>
                <p><span className="text-slate-500">Authorized Person:</span> <span className="font-medium">{(record as { principalName: string }).principalName}</span></p>
                <p><span className="text-slate-500">Address:</span> <span className="font-medium">{(record as { address: string }).address}</span></p>
                {(record as { studentCount: number | null }).studentCount !== null && (
                  <p><span className="text-slate-500">Student Count:</span> <span className="font-medium">{(record as { studentCount: number | null }).studentCount}</span></p>
                )}
              </>
            )}

            {type === "academy" && (
              <>
                <p><span className="text-slate-500">Authorized Person:</span> <span className="font-medium">{(record as { directorName: string }).directorName}</span></p>
                <p><span className="text-slate-500">Address:</span> <span className="font-medium">{(record as { address: string }).address}</span></p>
                {(record as { coachCount: number | null }).coachCount !== null && (
                  <p><span className="text-slate-500">Coach Count:</span> <span className="font-medium">{(record as { coachCount: number | null }).coachCount}</span></p>
                )}
              </>
            )}

            <p><span className="text-slate-500">Submitted:</span> <span className="font-medium">{formatDate(createdAt)}</span></p>
            {approvedAt && (
              <p><span className="text-slate-500">{status === "REJECTED" ? "Reviewed" : "Approved"}:</span> <span className="font-medium">{formatDate(approvedAt)}</span></p>
            )}
            {status === "REJECTED" && rejectionReason && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-secondary">
                <span className="font-semibold">Rejection reason:</span> {rejectionReason}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-accent" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {documentPath ? (
                <a
                  href={storage.getUrl(documentPath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-secondary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> View Document
                </a>
              ) : (
                <p className="text-slate-500">No documents submitted with this application.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <ApplicationReviewActions
                type={type}
                id={id}
                status={status}
                canApprove={canApprove}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-accent" /> Review History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-700">Application submitted</span>
              <span className="text-xs text-slate-400">{formatDate(createdAt)}</span>
            </li>
            {auditHistory.map((entry) => {
              const details = entry.details && typeof entry.details === "object" ? (entry.details as { event?: string; reason?: string }) : {};
              const isResubmit = details.event === "APPLICATION_RESUBMITTED";
              const label = isResubmit
                ? "Corrected and resubmitted"
                : entry.action === "APPROVE"
                  ? "Approved"
                  : entry.action === "REJECT"
                    ? "Rejected"
                    : entry.action;
              return (
                <li key={entry.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-700">
                    {label}
                    {!isResubmit && entry.user?.name ? ` by ${entry.user.name}` : ""}
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
