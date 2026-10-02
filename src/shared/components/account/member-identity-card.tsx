import Link from "next/link";
import { MapPin, Building2, UserCheck, GraduationCap, IdCard, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { MEMBER_TYPE_LABELS, type MemberHome } from "@/modules/account/member-home.server";
import type { RegistrationChoice, RegistrationKind } from "@/modules/applications/registration-choice.server";

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Returned for correction",
  EXPIRED: "Expired",
  SUSPENDED: "Suspended",
};

const CHOICES: Record<RegistrationKind, { label: string; desc: string; href: string; icon: LucideIcon; apply: string; open: string }> = {
  player: {
    label: "Player",
    desc: "Official state player licence for tournaments and rankings",
    href: "/account/player",
    icon: UserCheck,
    apply: "Apply as Player",
    open: "Open Player Portal",
  },
  coach: {
    label: "Coach",
    desc: "Certified coaching credentials with the association",
    href: "/account/coach",
    icon: GraduationCap,
    apply: "Apply as Coach",
    open: "Open Coach Portal",
  },
  membership: {
    label: "Membership",
    desc: "Club, School or Academy affiliation",
    href: "/account/memberships",
    icon: Building2,
    apply: "Apply for Membership",
    open: "Open Membership",
  },
};

const SOURCE_LABELS: Record<NonNullable<MemberHome["source"]>, string> = {
  player: "From your Player application",
  coach: "From your Coach application",
  membership: "From your Membership application",
  profile: "Saved on your profile",
};

/**
 * The member's registration. Nothing is required after sign-in: a new account
 * chooses ONE of Player, Coach or Membership here; once chosen, only that
 * registration is shown (the server decides which, from the database).
 */
export function MemberIdentityCard({ home, registration }: { home: MemberHome; registration: RegistrationChoice }) {
  if (!registration.primary) {
    return (
      <Card data-testid="member-identity">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choose Registration</p>
            <p className="mt-1 text-lg font-bold text-primary">What would you like to apply for?</p>
            <p className="text-sm text-slate-500">
              An account holds one registration — Player, Coach or Membership. You select your district on the application, and
              your district association reviews it.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {registration.allowed.map((kind) => {
              const c = CHOICES[kind];
              return (
                <Link
                  key={kind}
                  href={c.href}
                  className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all hover:border-primary hover:bg-white hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary shadow-xs">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wide text-primary">{c.label}</span>
                  <span className="text-xs text-slate-500">{c.desc}</span>
                  <span className="mt-auto text-xs font-semibold text-secondary group-hover:underline">{c.apply} →</span>
                </Link>
              );
            })}
          </div>
          {home.hasDistrict && home.districtName && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" /> {home.districtName}
              {home.stateName ? `, ${home.stateName}` : ""} · {home.source ? SOURCE_LABELS[home.source] : ""}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const held = registration.allowed.filter((k) => registration.status[k]);
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
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Registration</p>
            <p className="mt-1 text-lg font-bold text-primary">
              {held.map((k) => CHOICES[k].label).join(" · ")}
              {home.hasDistrict && home.districtName ? ` — ${home.districtName}${home.stateName ? `, ${home.stateName}` : ""}` : ""}
            </p>
            {home.source && <p className="text-sm text-slate-500">{SOURCE_LABELS[home.source]}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {held.map((k) => (
              <Button key={k} size="sm" asChild>
                <Link href={CHOICES[k].href}>
                  {registration.status[k] === "APPROVED"
                    ? CHOICES[k].open
                    : registration.status[k] === "REJECTED"
                      ? "Correct & Resubmit"
                      : "View Application"}
                </Link>
              </Button>
            ))}
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

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {held.map((k) => {
              const Icon = CHOICES[k].icon;
              const status = registration.status[k]!;
              return (
                <span key={k} className="flex items-center gap-2 text-sm text-slate-600">
                  <Icon className="h-4 w-4 text-slate-400" /> {CHOICES[k].label}:
                  <StatusBadge status={status} label={APPLICATION_STATUS_LABELS[status] ?? status} />
                </span>
              );
            })}
          </div>
          <span className="text-xs text-slate-500">Moving district? Raise a District Change request from your portal.</span>
        </div>
      </CardContent>
    </Card>
  );
}
