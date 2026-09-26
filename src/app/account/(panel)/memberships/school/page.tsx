import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { School, FileText, History, MapPin, Calendar, Download, AlertCircle, ShieldCheck, Users } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { getMembershipPricing } from "@/modules/account/membership-pricing.server";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import { SchoolRegistrationFlow } from "./school-registration-flow";
import { SchoolResubmitActions } from "./school-resubmit-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "School Affiliation Workspace",
  description: "Apply for school membership or view your affiliation status with Rajasthan Racquetball Association.",
};

export default async function AccountSchoolMembershipPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [dbUser, membership] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
      select: { name: true, email: true, phone: true },
    }),
    prisma.schoolMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { district: true },
    }),
  ]);

  const user = dbUser ?? {
    name: authUser.name || "User",
    email: authUser.email ?? "",
    phone: null,
  };

  if (membership) {
    const storage = getStorage();
    const history = await getApplicationHistory("memberships", membership.id, membership.createdAt);
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              School Affiliation Workspace
            </h1>
            <p className="text-sm text-slate-500">
              Official institutional membership and grassroots school racquetball affiliation records.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
            <Link href="/account/memberships">All Memberships</Link>
          </Button>
        </div>

        {/* School Hero Banner */}
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md sm:h-18 sm:w-18">
                  <School className="h-8 w-8 text-amber-400" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold sm:text-2xl">{membership.schoolName}</h2>
                    <StatusBadge status={membership.status} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {membership.district.name} District · Affiliated Educational Institution
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                      ID: {membership.membershipId}
                    </span>
                    {membership.studentCount !== null && (
                      <span className="bg-white/10 px-2 py-0.5 rounded text-slate-200 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Students: {membership.studentCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-slate-400">
                <span>Submitted on {formatDate(membership.createdAt)}</span>
                {membership.approvedAt && (
                  <span className="text-emerald-400 font-medium">Approved on {formatDate(membership.approvedAt)}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rejection Notice */}
        {membership.status === "REJECTED" && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-900">Application Requires Revision</CardTitle>
              </div>
              <CardDescription className="text-red-700 text-xs">
                {membership.rejectionReason || "Please update the required school affiliation details."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchoolResubmitActions
                reason={membership.rejectionReason}
                prefill={{ principalName: user.name, email: user.email, phone: user.phone ?? "" }}
                resubmit={{
                  id: membership.id,
                  schoolName: membership.schoolName,
                  district: membership.district.name,
                  address: membership.address,
                  studentCount: membership.studentCount,
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Details & Document Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <School className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">School Affiliation Details</CardTitle>
                  <CardDescription className="text-xs">Official institution profile on file with RRA</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Institution Name</p>
                  <p className="font-semibold text-slate-800 text-sm">{membership.schoolName}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Principal / Head</p>
                  <p className="font-semibold text-slate-800 text-sm">{membership.principalName}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">District Unit</p>
                  <p className="font-semibold text-slate-800 text-sm">{membership.district.name} District</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Student Strength</p>
                  <p className="font-semibold text-slate-800 text-sm">{membership.studentCount ?? "Not specified"}</p>
                </div>

                <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 space-y-1 border border-slate-100">
                  <p className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Campus Address</p>
                  <p className="font-semibold text-slate-800">{membership.address}</p>
                </div>

                {membership.expiresAt && (
                  <div className="sm:col-span-2 rounded-lg bg-blue-50/50 p-3 space-y-1 border border-blue-100">
                    <p className="text-blue-600 font-medium uppercase tracking-wider text-[10px]">Affiliation Validity</p>
                    <p className="font-semibold text-blue-900">Valid until {formatDate(membership.expiresAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Affiliation Certificate & Documents */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Affiliation Credentials</CardTitle>
                    <CardDescription className="text-xs">Official membership certificates</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {membership.certificatePath ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-xs">Official Certificate Issued</p>
                        <p className="text-[11px] text-emerald-600">RRA School Affiliation</p>
                      </div>
                    </div>
                    <Button size="sm" asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700 text-xs">
                      <a href={storage.getUrl(membership.certificatePath)} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download Certificate
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-medium text-slate-700">Certificate Pending Review</p>
                    <p className="text-[11px] text-slate-400">
                      Digital certificate will be generated upon approval by the state association.
                    </p>
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <Button variant="ghost" size="sm" asChild className="w-full text-xs text-slate-500">
                <Link href="/verify" target="_blank">
                  Verify Credentials in Registry →
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* Application History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Application History</CardTitle>
                <CardDescription className="text-xs">Timeline of events for this school membership</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {history.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 ${
                    i < history.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs font-medium text-slate-700">
                      {entry.label}
                      {entry.detail ? ` — ${entry.detail}` : ""}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 sm:self-auto">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pricing = await getMembershipPricing();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">School Membership Affiliation</h1>
          <p className="text-sm text-slate-500">
            Register your educational institution with Rajasthan Racquetball Association.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
          <Link href="/account/memberships">All Memberships</Link>
        </Button>
      </div>

      <Card className="mx-auto max-w-2xl border-slate-200/80 shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-lg">School Affiliation Application</CardTitle>
          <CardDescription className="text-xs">
            Complete the details below to submit your school for official state accreditation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <SchoolRegistrationFlow
            prefill={{ principalName: user.name, email: user.email, phone: user.phone ?? "" }}
            pricing={pricing.school}
          />
        </CardContent>
      </Card>
    </div>
  );
}
