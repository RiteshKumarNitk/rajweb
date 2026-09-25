import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, UserCheck, GraduationCap, Building2, Award, ClipboardList, Trophy, History, MessageSquare } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import {
  calculateProfileCompletion,
  PROFILE_FIELD_LABELS,
} from "@/modules/account/profile-completion";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "Your RRA account dashboard.",
};

const quickActions = [
  { label: "Register as a Player", href: "/account/player" },
  { label: "Register as a Coach", href: "/account/coach" },
  { label: "Apply for Membership", href: "/account/memberships" },
  { label: "Browse Tournaments", href: "/account/tournaments" },
  { label: "View Certificates", href: "/account/certificates" },
];

export default async function AccountDashboardPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const userWhere = authUser.id
    ? { id: authUser.id }
    : { email: authUser.email ?? "" };

  const [dbUser, player, coach, club, school, academy, upcomingTournaments, requests] = await Promise.all([
    prisma.user.findFirst({
      where: userWhere,
      select: {
        id: true,
        name: true,
        phone: true,
        profile: { select: { address: true, city: true, state: true, pincode: true } },
      },
    }),
    prisma.player.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: {
        id: true,
        status: true,
        playerId: true,
        createdAt: true,
        rejectionReason: true,
        _count: { select: { certificates: { where: { isRevoked: false } } } },
      },
    }),
    prisma.coach.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: {
        id: true,
        status: true,
        coachId: true,
        createdAt: true,
        rejectionReason: true,
        _count: { select: { certificates: { where: { isRevoked: false } } } },
      },
    }),
    prisma.clubMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, rejectionReason: true },
    }),
    prisma.schoolMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, rejectionReason: true },
    }),
    prisma.academyMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, rejectionReason: true },
    }),
    prisma.tournament.count({ where: { status: { in: ["REGISTRATION_OPEN", "IN_PROGRESS"] } } }),
    prisma.request.findMany({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true },
    }),
  ]);

  const user = dbUser ?? {
    name: authUser.name || "User",
    phone: null,
    profile: null,
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
  const completedRequests = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED").length;

  const completion = calculateProfileCompletion({
    name: user.name,
    phone: user.phone,
    profile: user.profile,
  });

  const memberships = [club, school, academy].filter(Boolean) as Array<{ status: string; rejectionReason: string | null }>;
  const activeMemberships = memberships.filter((m) => m.status === "APPROVED" || m.status === "ACTIVE").length;
  const rejectedMemberships = memberships.filter((m) => m.status === "REJECTED");
  const certificateCount = (player?._count.certificates ?? 0) + (coach?._count.certificates ?? 0);
  const pendingCount = [player, coach, club, school, academy].filter(
    (r) => r && r.status === "PENDING"
  ).length;

  // Recent Activity — reuses the existing admin audit-log system, filtered
  // to entries whose entity is one of this user's own records.
  const ownedEntities = [
    player && { module: "players", entityId: player.id },
    coach && { module: "coaches", entityId: coach.id },
    club && { module: "memberships", entityId: club.id },
    school && { module: "memberships", entityId: school.id },
    academy && { module: "memberships", entityId: academy.id },
    ...requests.map((r) => ({ module: "requests", entityId: r.id })),
  ].filter(Boolean) as Array<{ module: string; entityId: string }>;

  const recentActivity = ownedEntities.length
    ? await prisma.auditLog.findMany({
        where: { OR: ownedEntities },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, action: true, module: true, createdAt: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Welcome back, {(user.name || "User").split(" ")[0]}</h1>
        <p className="text-slate-500">Here&apos;s a summary of your RRA account.</p>
      </div>

      {completion.percent < 100 ? (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-primary">Profile Completion</p>
              <p className="text-sm font-semibold text-primary">{completion.percent}%</p>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${completion.percent}%` }} />
            </div>
            <div>
              <p className="mb-2 text-sm text-slate-600">Complete your profile to continue.</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(["name", "phone", "address", "city", "state", "pincode"] as const).map((field) => {
                  const isMissing = completion.missing.includes(field);
                  return (
                    <li key={field} className="flex items-center gap-2 text-sm">
                      {isMissing ? (
                        <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      )}
                      <span className={isMissing ? "text-slate-500" : "text-slate-700"}>{PROFILE_FIELD_LABELS[field]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <Button asChild>
              <Link href="/account/profile">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-6">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              Your profile is complete.{" "}
              <Link href="/account/profile" className="underline hover:text-green-900">Edit details</Link>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Player Status</CardTitle>
            <UserCheck className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {player ? (
              <div className="space-y-1">
                <StatusBadge status={player.status} />
                <p className="text-xs text-slate-500">ID: {player.playerId}</p>
                <p className="text-xs text-slate-400">Submitted {formatDate(player.createdAt)}</p>
                {player.status === "REJECTED" && player.rejectionReason && (
                  <p className="text-xs text-secondary">Reason: {player.rejectionReason}</p>
                )}
                <Link href="/account/player" className="text-xs text-secondary hover:underline">
                  {player.status === "REJECTED" ? "Correct & Resubmit" : "Open Player Portal"}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">No player registration yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/account/player">Register Now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Coach Status</CardTitle>
            <GraduationCap className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {coach ? (
              <div className="space-y-1">
                <StatusBadge status={coach.status} />
                <p className="text-xs text-slate-500">ID: {coach.coachId}</p>
                <p className="text-xs text-slate-400">Submitted {formatDate(coach.createdAt)}</p>
                {coach.status === "REJECTED" && coach.rejectionReason && (
                  <p className="text-xs text-secondary">Reason: {coach.rejectionReason}</p>
                )}
                <Link href="/account/coach" className="text-xs text-secondary hover:underline">
                  {coach.status === "REJECTED" ? "Correct & Resubmit" : "Open Coach Portal"}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">No coach registration yet</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/account/coach">Register Now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Memberships</CardTitle>
            <Building2 className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">No memberships</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/account/memberships">Explore Memberships</Link>
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-bold text-primary">{activeMemberships}</p>
                <p className="mb-1 text-xs text-slate-500">of {memberships.length} application{memberships.length > 1 ? "s" : ""} active</p>
                {rejectedMemberships.length > 0 && (
                  <p className="text-xs text-secondary">
                    {rejectedMemberships.length} rejected
                    {rejectedMemberships[0].rejectionReason ? ` — ${rejectedMemberships[0].rejectionReason}` : ""}
                  </p>
                )}
                <Link href="/account/memberships" className="text-xs text-secondary hover:underline">
                  {rejectedMemberships.length > 0 ? "Correct & Resubmit" : "Open Membership Portal"}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Certificates</CardTitle>
            <Award className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {certificateCount === 0 ? (
              <p className="text-sm text-slate-500">No certificates available</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-primary">{certificateCount}</p>
                <Link href="/account/certificates" className="text-xs text-secondary hover:underline">View certificates</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pending Applications</CardTitle>
            <ClipboardList className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {pendingCount === 0 ? (
              <p className="text-sm text-slate-500">Nothing pending</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-primary">{pendingCount}</p>
                <Link href="/account/applications" className="text-xs text-secondary hover:underline">View applications</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Upcoming Tournaments</CardTitle>
            <Trophy className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {upcomingTournaments === 0 ? (
              <p className="text-sm text-slate-500">No tournaments open right now</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-primary">{upcomingTournaments}</p>
                <Link href="/account/tournaments" className="text-xs text-secondary hover:underline">Browse tournaments</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Requests</CardTitle>
            <MessageSquare className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests</p>
            ) : (
              <div>
                <p className="text-3xl font-bold text-primary">{pendingRequests}</p>
                <p className="mb-1 text-xs text-slate-500">
                  {pendingRequests} Pending{completedRequests > 0 ? `, ${completedRequests} Completed` : ""}
                </p>
                <Link
                  href={player ? "/account/player" : coach ? "/account/coach" : "/account/dashboard"}
                  className="text-xs text-secondary hover:underline"
                >
                  View Requests
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Button key={action.href} variant="outline" asChild className="justify-start">
              <Link href={action.href} prefetch>{action.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-accent" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity on your account yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0">
                  <span className="text-slate-700">
                    {log.action.charAt(0) + log.action.slice(1).toLowerCase()} — {log.module}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
