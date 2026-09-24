import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, FileText, History } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { CoachRegistrationFlow } from "./coach-registration-flow";
import { CoachResubmitActions } from "./coach-resubmit-actions";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import { RequestsPanel, type RequestRow } from "@/shared/components/requests/requests-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coach Registration",
  description: "Register as a coach or view your coach registration status.",
};

export default async function AccountCoachPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [user, coach] = await Promise.all([
    prisma.user.findUnique({ where: { id: authUser.id }, select: { name: true, email: true, phone: true } }),
    prisma.coach.findUnique({
      where: { userId: authUser.id },
      include: {
        district: true,
        certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
      },
    }),
  ]);
  if (!user) redirect("/account/login");

  if (coach) {
    const certificate = coach.certificates[0];
    const storage = getStorage();
    const history = await getApplicationHistory("coaches", coach.id, coach.createdAt);
    const requests =
      coach.status === "APPROVED"
        ? await prisma.request.findMany({
            where: { coachId: coach.id },
            include: { requestedDistrict: true },
            orderBy: { createdAt: "desc" },
          })
        : [];
    const requestRows: RequestRow[] = requests.map((r) => ({
      id: r.id,
      requestNumber: r.requestNumber,
      type: r.type,
      status: r.status,
      reason: r.reason,
      requestedValue: r.requestedValue,
      requestedMobile: r.requestedMobile,
      requestedEmail: r.requestedEmail,
      requestedAddress: r.requestedAddress,
      requestedDistrict: r.requestedDistrict?.name ?? null,
      adminRemarks: r.adminRemarks,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    }));

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Coach Workspace</h1>
          <p className="text-slate-500">Your coach registration and everything tied to it.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{coach.name}</CardTitle>
              <StatusBadge status={coach.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-slate-500">Coach ID:</span> <span className="font-medium">{coach.coachId}</span></p>
              <p><span className="text-slate-500">District:</span> <span className="font-medium">{coach.district.name}</span></p>
              <p><span className="text-slate-500">Qualification:</span> <span className="font-medium">{coach.qualification}</span></p>
              <p><span className="text-slate-500">Certification Level:</span> <span className="font-medium">{coach.certificationLevel.replace("_", " ")}</span></p>
              <p><span className="text-slate-500">Application Date:</span> <span className="font-medium">{formatDate(coach.createdAt)}</span></p>
              {coach.approvedAt && (
                <p><span className="text-slate-500">Approval Date:</span> <span className="font-medium">{formatDate(coach.approvedAt)}</span></p>
              )}
              {coach.status === "REJECTED" && (
                <CoachResubmitActions
                  reason={coach.rejectionReason}
                  prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
                  resubmit={{
                    id: coach.id,
                    qualification: coach.qualification,
                    certificationLevel: coach.certificationLevel,
                    district: coach.district.name,
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-accent" /> Certificate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {certificate ? (
                <>
                  <p className="font-medium text-primary">{certificate.certificateNumber}</p>
                  <p className="text-xs text-slate-400">Issued {formatDate(certificate.issuedAt)}</p>
                  {certificate.pdfPath && (
                    <a
                      href={storage.getUrl(certificate.pdfPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-secondary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> View Document
                    </a>
                  )}
                </>
              ) : (
                <p className="text-slate-500">Available once your registration is approved and a certificate is issued.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-accent" /> Application History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {history.map((entry, i) => (
                <li key={entry.id} className={`flex items-center justify-between ${i < history.length - 1 ? "border-b border-slate-100 pb-2" : ""}`}>
                  <span className="text-slate-700">
                    {entry.label}
                    {entry.detail ? ` — ${entry.detail}` : ""}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {coach.status === "APPROVED" && (
          <RequestsPanel
            profileType="coach"
            current={{ email: coach.email, mobile: coach.mobile, district: coach.district.name }}
            requests={requestRows}
          />
        )}

        <p className="mt-4 text-xs text-slate-400">
          Having a Coach registration is independent of any Player registration on this account.{" "}
          <Link href="/account/player" className="text-secondary hover:underline">View Player status</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Coach Registration</h1>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <CoachRegistrationFlow prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
