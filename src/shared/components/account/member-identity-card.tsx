import Link from "next/link";
import { MapPin, Building2, BadgeCheck, UserCog, IdCard } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { MEMBER_TYPE_LABELS, type MemberHome } from "@/modules/account/member-home.server";

function profileStatus(home: MemberHome): { label: string; status: string; action?: { href: string; label: string } } {
  if (home.memberType === "PLAYER") {
    if (!home.playerStatus) return { label: "Player registration not submitted", status: "PENDING", action: { href: "/account/player", label: "Register as player" } };
    return { label: `Player — ${home.playerStatus.toLowerCase()}`, status: home.playerStatus };
  }
  if (home.memberType === "COACH") {
    if (!home.coachStatus) return { label: "Coach registration not submitted", status: "PENDING", action: { href: "/account/coach", label: "Register as coach" } };
    return { label: `Coach — ${home.coachStatus.toLowerCase()}`, status: home.coachStatus };
  }
  return { label: "Active member", status: "ACTIVE" };
}

/** The member's district identity: State, District, member type and profile status. */
export function MemberIdentityCard({ home }: { home: MemberHome }) {
  const status = profileStatus(home);
  const fields = [
    { icon: MapPin, label: "State", value: home.stateName ?? "Not set" },
    { icon: Building2, label: "District", value: home.districtName ?? "Not set" },
    { icon: UserCog, label: "Member Type", value: home.memberType ? MEMBER_TYPE_LABELS[home.memberType] : "Not set" },
    ...(home.memberId ? [{ icon: IdCard, label: "Member ID", value: home.memberId }] : []),
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">District Membership</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {home.districtName && home.stateName ? `${home.districtName}, ${home.stateName}` : "District not set"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {status.action && (
              <Button size="sm" asChild>
                <Link href={status.action.href}>{status.action.label}</Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href="/account/profile">Edit Profile</Link>
            </Button>
          </div>
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <BadgeCheck className="h-4 w-4 text-emerald-600" /> Profile status:
            <StatusBadge status={status.status} label={status.label} />
          </span>
          <span className="text-xs text-slate-500">
            Moving district? Raise a District Change request from your Player or Coach portal.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
