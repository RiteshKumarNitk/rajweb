import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, History } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";
import { getMembershipPricing } from "@/modules/account/membership-pricing.server";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import { AcademyRegistrationFlow } from "./academy-registration-flow";
import { AcademyResubmitActions } from "./academy-resubmit-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Academy Membership",
  description: "Apply for academy membership or view your application status.",
};

export default async function AccountAcademyMembershipPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [dbUser, membership] = await Promise.all([
    prisma.user.findFirst({
      where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
      select: { name: true, email: true, phone: true },
    }),
    prisma.academyMembership.findFirst({
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
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Academy Membership Workspace</h1>
          <p className="text-slate-500">Your academy membership application and its status.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>{membership.academyName}</CardTitle>
              <StatusBadge status={membership.status} />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-slate-500">Membership ID:</span> <span className="font-medium">{membership.membershipId}</span></p>
              <p><span className="text-slate-500">District:</span> <span className="font-medium">{membership.district.name}</span></p>
              <p><span className="text-slate-500">Director:</span> <span className="font-medium">{membership.directorName}</span></p>
              {membership.coachCount !== null && (
                <p><span className="text-slate-500">Coach Count:</span> <span className="font-medium">{membership.coachCount}</span></p>
              )}
              <p><span className="text-slate-500">Application Date:</span> <span className="font-medium">{formatDate(membership.createdAt)}</span></p>
              {membership.approvedAt && (
                <p><span className="text-slate-500">Approval Date:</span> <span className="font-medium">{formatDate(membership.approvedAt)}</span></p>
              )}
              {membership.expiresAt && (
                <p><span className="text-slate-500">Valid Until:</span> <span className="font-medium">{formatDate(membership.expiresAt)}</span></p>
              )}
              {membership.status === "REJECTED" && (
                <AcademyResubmitActions
                  reason={membership.rejectionReason}
                  prefill={{ directorName: user.name, email: user.email, phone: user.phone ?? "" }}
                  resubmit={{
                    id: membership.id,
                    academyName: membership.academyName,
                    district: membership.district.name,
                    address: membership.address,
                    coachCount: membership.coachCount,
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-accent" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {membership.certificatePath ? (
                <a
                  href={storage.getUrl(membership.certificatePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-secondary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> View Membership Certificate
                </a>
              ) : (
                <p className="text-slate-500">No documents available yet.</p>
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
      </div>
    );
  }

  const pricing = await getMembershipPricing();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Academy Membership</h1>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <AcademyRegistrationFlow
            prefill={{ directorName: user.name, email: user.email, phone: user.phone ?? "" }}
            pricing={pricing.academy}
          />
        </CardContent>
      </Card>
    </div>
  );
}
