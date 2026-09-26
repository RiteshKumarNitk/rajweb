import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  FileText,
  History,
  GraduationCap,
  MapPin,
  Sparkles,
  ShieldCheck,
  Download,
  AlertCircle,
  Calendar,
} from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { CoachRegistrationFlow } from "./coach-registration-flow";
import { CoachResubmitActions } from "./coach-resubmit-actions";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import { RequestsPanel, type RequestRow } from "@/shared/components/requests/requests-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coach Workspace & Registration",
  description: "Official Rajasthan Racquetball coach registration and certification credentials.",
};

export default async function AccountCoachPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [dbUser, coach] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
      select: { name: true, email: true, phone: true },
    }),
    prisma.coach.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: {
        district: true,
        certificates: { where: { isRevoked: false }, orderBy: { issuedAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const user = dbUser ?? {
    name: authUser.name || "User",
    email: authUser.email ?? "",
    phone: null,
  };

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

    const initial = coach.name ? coach.name.charAt(0).toUpperCase() : "C";

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Coach Workspace</h1>
            <p className="text-sm text-slate-500">
              Manage your certified coaching credentials, state licenses, and district affiliations.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
            <Link href="/account/verify" className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verify Credentials
            </Link>
          </Button>
        </div>

        {/* Coach Hero Banner */}
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md sm:h-18 sm:w-18">
                  {initial}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold sm:text-2xl">{coach.name}</h2>
                    <StatusBadge status={coach.status} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {coach.district.name} District · Certified State Coach
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                      ID: {coach.coachId}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-slate-200">
                      Level: {coach.certificationLevel.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-slate-400">
                <span>Application Submitted: {formatDate(coach.createdAt)}</span>
                {coach.approvedAt && (
                  <span className="text-emerald-400 font-medium">Approved on {formatDate(coach.approvedAt)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Notice if any */}
        {coach.status === "REJECTED" && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-900">Application Returned for Review</CardTitle>
              </div>
              <CardDescription className="text-red-700 text-xs">
                {coach.rejectionReason || "Please make the required adjustments and resubmit."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoachResubmitActions
                reason={coach.rejectionReason}
                prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
                resubmit={{
                  id: coach.id,
                  district: coach.district.name,
                  qualification: coach.qualification,
                  certificationLevel: coach.certificationLevel,
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Coach Details & Certificate Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Coaching Qualifications & License</CardTitle>
                  <CardDescription>Verified qualifications under Rajasthan Racquetball Association</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid gap-2 sm:grid-cols-2 rounded-lg bg-slate-50 p-4 border border-slate-100">
                <div>
                  <span className="text-slate-500">Coach Full Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{coach.name}</p>
                </div>
                <div>
                  <span className="text-slate-500">Official Coach License ID</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{coach.coachId}</p>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500">District Unit</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{coach.district.name}</p>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500">Certification Grade</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{coach.certificationLevel.replace(/_/g, " ")}</p>
                </div>
                <div className="pt-2 sm:col-span-2">
                  <span className="text-slate-500">Academic & Sports Qualification</span>
                  <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">{coach.qualification}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Card */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Coach Certificate</CardTitle>
                    <CardDescription>Official state credential</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {certificate ? (
                  <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{certificate.certificateNumber}</span>
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Valid
                      </span>
                    </div>
                    <p className="text-slate-500">Issued on {formatDate(certificate.issuedAt)}</p>
                  </div>
                ) : coach.status === "APPROVED" ? (
                  <div className="rounded-lg bg-slate-50 p-4 border border-dashed border-slate-200 text-slate-500">
                    <p className="font-medium text-slate-700">Approved by Association</p>
                    <p className="text-[11px] mt-1">Certificate generation in progress by federation committee.</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4 border border-dashed border-slate-200 text-slate-500">
                    <p className="text-[11px]">Available once coach credentials are verified and approved.</p>
                  </div>
                )}
              </CardContent>
            </div>

            {certificate && (
              <div className="p-6 pt-0 flex flex-col gap-2">
                {certificate.pdfPath && (
                  <Button variant="outline" size="sm" asChild className="w-full text-xs">
                    <a href={storage.getUrl(certificate.pdfPath)} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF Certificate
                    </a>
                  </Button>
                )}
                <Button size="sm" asChild className="w-full text-xs bg-primary text-white hover:bg-slate-800">
                  <Link href={`/account/verify?certificateNumber=${encodeURIComponent(certificate.certificateNumber)}`}>
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Verify & View Template
                  </Link>
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Application History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Coach Application Timeline</CardTitle>
                <CardDescription className="text-xs">History of accreditation review</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100 text-xs">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span className="font-medium text-slate-800">
                      {entry.label}
                      {entry.detail ? ` — ${entry.detail}` : ""}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Requests Panel */}
        {coach.status === "APPROVED" && (
          <RequestsPanel
            profileType="coach"
            current={{ email: coach.email, mobile: coach.mobile, district: coach.district.name }}
            requests={requestRows}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Coach Registration</h1>
        <p className="text-sm text-slate-500">
          Apply for certified coaching credentials and instructor license with Rajasthan Racquetball Association.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <CoachRegistrationFlow prefill={{ name: user.name, email: user.email, phone: user.phone ?? "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
