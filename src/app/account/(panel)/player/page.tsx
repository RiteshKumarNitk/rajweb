import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History, UserCheck, MapPin, IdCard, FileText, AlertCircle, PencilLine, Clock } from "lucide-react";
import { getApplicationHistory } from "@/modules/applications/application-history.server";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/lib/utils";
import { PlayerRegistrationFlow } from "./player-registration-flow";
import { PlayerResubmitActions } from "./player-resubmit-actions";
import { ApplicationPendingNotice } from "@/shared/components/account/application-pending-notice";
import { GovernmentIdSummary, governmentIdOnFile } from "@/shared/components/account/government-id-summary";
import { getRegistrationChoice } from "@/modules/applications/registration-choice.server";
import { RegistrationLockedNotice } from "@/shared/components/account/registration-locked-notice";
import { getOwnPlayer } from "@/modules/players/own-player.server";
import { GENDER_LABELS } from "@/modules/requests/request-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Player Profile",
  description: "Your Rajasthan Racquetball Association player profile, registration status and documents.",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Returned for correction",
  EXPIRED: "Expired",
};

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof UserCheck; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-accent" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

export default async function AccountPlayerPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  // One registration per account: another kind's page is locked (the APIs refuse it too).
  const registration = await getRegistrationChoice(authUser.id);
  if (!registration.allowed.includes("player")) return <RegistrationLockedNotice requested="player" choice={registration} />;

  // Everything below is the session user's own data — no id from the request is used.
  const [player, account] = await Promise.all([
    getOwnPlayer(authUser.id),
    prisma.user
      .findUnique({
        where: { id: authUser.id },
        select: {
          name: true,
          email: true,
          phone: true,
          profile: {
            select: { dateOfBirth: true, gender: true, address: true, city: true, state: true, pincode: true, stateId: true, districtId: true },
          },
        },
      })
      .catch(() => null),
  ]);

  if (!player) {
    // Prefilled from the account — the server still validates everything on submit.
    const prefill = {
      name: account?.name ?? authUser.name ?? "",
      email: account?.email ?? authUser.email ?? "",
      phone: account?.phone ?? "",
      dateOfBirth: account?.profile?.dateOfBirth ? account.profile.dateOfBirth.toISOString().slice(0, 10) : "",
      gender: account?.profile?.gender ?? undefined,
      stateId: account?.profile?.stateId ?? "",
      districtId: account?.profile?.districtId ?? "",
    };
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Player Registration</h1>
          <p className="text-sm text-slate-500">
            Register with Rajasthan Racquetball Association to get your official state player license and compete in championships.
          </p>
        </div>
        <Card className="mx-auto max-w-2xl border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <PlayerRegistrationFlow prefill={prefill} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const history = await getApplicationHistory("players", player.id, player.createdAt);
  const stateName = player.district.state?.name ?? null;
  const address = account?.profile;

  return (
    <div className="space-y-6">
      {player.status === "PENDING" && (
        <ApplicationPendingNotice kind="player" submittedAt={player.createdAt} stateName={stateName} districtName={player.district.name} />
      )}

      {player.status === "REJECTED" && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-base text-red-900">Application Returned for Correction</CardTitle>
            </div>
            <CardDescription className="text-xs text-red-700">
              {player.rejectionReason || "Please update the required details and resubmit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlayerResubmitActions
              reason={player.rejectionReason}
              prefill={{ name: player.name, email: player.email, phone: player.mobile }}
              resubmit={{
                id: player.id,
                dateOfBirth: player.dateOfBirth.toISOString().slice(0, 10),
                gender: player.gender,
                stateId: player.district.stateId ?? "",
                districtId: player.districtId,
                category: player.category ?? "",
                governmentId: governmentIdOnFile(player),
              }}
            />
          </CardContent>
        </Card>
      )}

      {player.status === "EXPIRED" && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="flex items-center gap-3 p-5 text-sm text-slate-700">
            <Clock className="h-5 w-5 text-slate-500" /> Your player registration has expired. Contact your district association to renew it.
          </CardContent>
        </Card>
      )}

      {player.status === "APPROVED" && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Your approved details are read-only. To change anything — including your district — send a request to your association.
          </p>
          <Button size="sm" asChild className="shrink-0">
            <Link href="/account/player/requests?new=1">
              <PencilLine className="h-4 w-4" /> Request Change
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Personal Information" icon={UserCheck}>
          <Field label="Full Name" value={player.name} />
          <Field label="Date of Birth" value={formatDate(player.dateOfBirth)} />
          <Field label="Gender" value={GENDER_LABELS[player.gender] ?? player.gender} />
          <Field label="Email" value={player.email} />
          <Field label="Mobile" value={player.mobile} />
          <Field label="Profile Photo" value={player.photo ? "On file" : "Not provided"} />
        </Section>

        <Section title="Player Information" icon={IdCard}>
          <Field label="Player ID" value={<span className="font-mono">{player.playerId}</span>} />
          <Field label="Status" value={<StatusBadge status={player.status} label={STATUS_LABELS[player.status] ?? player.status} />} />
          <Field label="Registered On" value={formatDate(player.createdAt)} />
          <Field label="Approved On" value={player.approvedAt ? formatDate(player.approvedAt) : "—"} />
          <Field label="Valid Until" value={player.expiresAt ? formatDate(player.expiresAt) : "—"} />
          <Field label="Playing Category" value={player.category || "Not specified"} />
          <Field label="State" value={stateName ?? "—"} />
          <Field label="District" value={player.district.name} />
        </Section>

        <Section title="Address" icon={MapPin}>
          <Field label="Address" value={address?.address || "Not on file"} wide />
          <Field label="City / Village" value={address?.city || "—"} />
          <Field label="PIN Code" value={address?.pincode || "—"} />
          <Field label="State" value={stateName ?? "—"} />
          <Field label="District" value={player.district.name} />
        </Section>

        <Section title="Documents" icon={FileText}>
          <Field
            label="Government ID"
            wide
            value={
              player.governmentIdType ? (
                <div className="space-y-1">
                  <p>{player.governmentIdDocumentId ? "Uploaded" : "Number provided, no document uploaded"}</p>
                  <GovernmentIdSummary type={player.governmentIdType} number={player.governmentIdNumber} documentId={player.governmentIdDocumentId} />
                </div>
              ) : (
                "Not Provided"
              )
            }
          />
        </Section>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-accent" /> Application Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-slate-100 text-xs">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between py-2.5">
                <span className="font-medium text-slate-800">
                  {entry.label}
                  {entry.detail ? ` — ${entry.detail}` : ""}
                </span>
                <span className="font-mono text-[11px] text-slate-400">{formatDate(entry.date)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
