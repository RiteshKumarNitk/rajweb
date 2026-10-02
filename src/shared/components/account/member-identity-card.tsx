import Link from "next/link";
import { MapPin, Building2, UserCheck, GraduationCap, IdCard } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { MEMBER_TYPE_LABELS, type MemberHome } from "@/modules/account/member-home.server";

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Returned for correction",
  EXPIRED: "Expired",
};

const SOURCE_LABELS: Record<NonNullable<MemberHome["source"]>, string> = {
  player: "From your Player application",
  coach: "From your Coach application",
  profile: "Saved on your profile",
};

/**
 * The member's district identity and where each application stands. Nothing
 * here is required after sign-in: a member applies as a Player or Coach only
 * when they choose to, and picks their State/District on that application.
 */
export function MemberIdentityCard({ home }: { home: MemberHome }) {
  const applications = [
    { kind: "Player", href: "/account/player", icon: UserCheck, status: home.playerStatus },
    { kind: "Coach", href: "/account/coach", icon: GraduationCap, status: home.coachStatus },
  ];
  const notApplied = applications.filter((a) => !a.status);
  const fields = [
    { icon: MapPin, label: "State", value: home.stateName ?? "—" },
    { icon: Building2, label: "District", value: home.districtName ?? "—" },
    ...(home.source === "profile" && home.memberType
      ? [{ icon: UserCheck, label: "Member Type", value: MEMBER_TYPE_LABELS[home.memberType] }]
      : []),
    ...(home.memberId ? [{ icon: IdCard, label: "Member ID", value: home.memberId }] : []),
  ];

  return (
    <Card data-testid="member-identity">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {home.hasDistrict ? "District Membership" : "Get started"}
            </p>
            <p className="mt-1 text-lg font-bold text-primary">
              {home.hasDistrict && home.districtName
                ? `${home.districtName}${home.stateName ? `, ${home.stateName}` : ""}`
                : "What would you like to apply for?"}
            </p>
            <p className="text-sm text-slate-500">
              {home.source
                ? SOURCE_LABELS[home.source]
                : "Choose a portal — you select your State and District on the application, and your district association reviews it."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {notApplied.map((a, i) => (
              <Button key={a.kind} size="sm" variant={i === 0 ? "default" : "outline"} asChild>
                <Link href={a.href}>Apply as {a.kind}</Link>
              </Button>
            ))}
            {!home.hasDistrict && (
              <Button size="sm" variant="outline" asChild>
                <Link href="/account/memberships">Memberships</Link>
              </Button>
            )}
          </div>
        </div>

        {home.hasDistrict && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.label} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                  <f.icon className="h-3.5 w-3.5" /> {f.label}
                </dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {applications.some((a) => a.status) && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {applications
                .filter((a) => a.status)
                .map((a) => (
                  <Link key={a.kind} href={a.href} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary">
                    <a.icon className="h-4 w-4 text-slate-400" /> {a.kind} application:
                    <StatusBadge status={a.status!} label={APPLICATION_STATUS_LABELS[a.status!] ?? a.status!} />
                  </Link>
                ))}
            </div>
            <span className="text-xs text-slate-500">
              Moving district? Raise a District Change request from your Player or Coach portal.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
