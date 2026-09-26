import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, FileText, History, MapPin, Calendar, Download, AlertCircle, ShieldCheck } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { getMembershipPricing } from "@/modules/account/membership-pricing.server";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import { ClubRegistrationFlow } from "./club-registration-flow";
import { ClubResubmitActions } from "./club-resubmit-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Club Affiliation Workspace",
  description: "Apply for club membership or view your affiliation status with Rajasthan Racquetball Association.",
};

export default async function AccountClubMembershipPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [dbUser, membership] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
      select: { name: true, email: true, phone: true },
    }),
    prisma.clubMembership.findFirst({
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
              Club Affiliation Workspace
            </h1>
            <p className="text-sm text-slate-500">
              Official institutional membership and racquetball club affiliation records.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
            <Link href="/account/memberships">All Memberships</Link>
          </Button>
        </div>

        {/* Club Hero Banner */}
        <Card className="overflow-hidden border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-md">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md sm:h-18 sm:w-18">
                  <Building2 className="h-8 w-8 text-amber-400" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold sm:text-2xl">{membership.clubName}</h2>
                    <StatusBadge status={membership.status} />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" /> {membership.district.name} District · Affiliated Sports Club
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                      ID: {membership.membershipId}
                    </span>
                    <span className="bg-white/10 px-2 py-0.5 rounded text-slate-200">
                      Courts: {membership.numberOfCourts}
                    </span>
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
                {membership.rejectionReason || "Please update the required club affiliation details."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClubResubmitActions
                reason={membership.rejectionReason}
                prefill={{ contactPerson: user.name, email: user.email, phone: user.phone ?? "" }}
                resubmit={{
                  id: membership.id,
                  clubName: membership.clubName,
                  district: membership.district.name,
                  address: membership.address,
                  courts: membership.numberOfCourts,
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Club Affiliation Details</CardTitle>
                  <CardDescription>Verified club facility details under Rajasthan Racquetball Association</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid gap-2 sm:grid-cols-2 rounded-lg bg-slate-50 p-4 border border-slate-100">
                <div>
                  <span className="text-slate-500">Club Name</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{membership.clubName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Affiliation ID</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{membership.membershipId}</p>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500">Designated Contact Person</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{membership.contactPerson}</p>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500">Number of Racquetball Courts</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{membership.numberOfCourts} Court(s)</p>
                </div>
                <div className="pt-2 sm:col-span-2">
                  <span className="text-slate-500">Facility Street Address</span>
                  <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">{membership.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Card */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Affiliation Certificate</CardTitle>
                    <CardDescription>Official state institutional document</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {membership.certificatePath ? (
                  <div className="rounded-lg bg-emerald-50/50 p-4 border border-emerald-200 space-y-2">
                    <p className="font-bold text-emerald-800">Affiliation Certificate Active</p>
                    <p className="text-slate-500">Issued against ID {membership.membershipId}</p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50 p-4 border border-dashed border-slate-200 text-slate-500">
                    <p className="text-[11px]">Certificate document will be issued once affiliation is verified.</p>
                  </div>
                )}
              </CardContent>
            </div>

            {membership.certificatePath && (
              <div className="p-6 pt-0">
                <Button variant="outline" size="sm" asChild className="w-full text-xs">
                  <a href={storage.getUrl(membership.certificatePath)} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download Affiliation Document
                  </a>
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* History Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Affiliation Review Timeline</CardTitle>
                <CardDescription className="text-xs">History of club accreditation</CardDescription>
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
      </div>
    );
  }

  const pricing = await getMembershipPricing();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Club Affiliation</h1>
        <p className="text-sm text-slate-500">
          Affiliate your sports club with Rajasthan Racquetball Association for sanctioned tournaments and official player licenses.
        </p>
      </div>

      <Card className="mx-auto max-w-2xl border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <ClubRegistrationFlow
            prefill={{ contactPerson: user.name, email: user.email, phone: user.phone ?? "" }}
            pricing={pricing.club}
          />
        </CardContent>
      </Card>
    </div>
  );
}
