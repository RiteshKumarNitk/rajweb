import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  GraduationCap,
  Building2,
  Award,
  ClipboardList,
  Trophy,
  History,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ChevronRight,
  FileCheck,
  Calendar,
  AlertCircle,
} from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
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
  description: "Your official Rajasthan Racquetball Association account dashboard.",
};

const quickActionCards = [
  {
    title: "Player Portal",
    desc: "Register as an official state player or manage your profile",
    href: "/account/player",
    icon: UserCheck,
    color: "bg-blue-500/10 text-blue-600 border-blue-200",
    badge: "Official ID",
  },
  {
    title: "Coach Portal",
    desc: "Register or manage certified coaching credentials",
    href: "/account/coach",
    icon: GraduationCap,
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
    badge: "Certified",
  },
  {
    title: "Memberships",
    desc: "Club, School, and Academy institutional affiliation",
    href: "/account/memberships",
    icon: Building2,
    color: "bg-purple-500/10 text-purple-600 border-purple-200",
    badge: "Affiliation",
  },
  {
    title: "Tournaments",
    desc: "Browse upcoming state championships and register",
    href: "/account/tournaments",
    icon: Trophy,
    color: "bg-red-500/10 text-red-600 border-red-200",
    badge: "Compete",
  },
  {
    title: "My Certificates",
    desc: "Download verified player and coach digital certificates",
    href: "/account/certificates",
    icon: Award,
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    badge: "Verified",
  },
  {
    title: "Verify Certificate",
    desc: "Public authentication check for any issued certificate",
    href: "/verify",
    icon: ShieldCheck,
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    badge: "Instant",
  },
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
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        role: { select: { name: true } },
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
      select: { id: true, status: true, rejectionReason: true, clubName: true },
    }),
    prisma.schoolMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, rejectionReason: true, schoolName: true },
    }),
    prisma.academyMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, rejectionReason: true, academyName: true },
    }),
    prisma.tournament.count({ where: { status: { in: ["REGISTRATION_OPEN", "IN_PROGRESS"] } } }),
    prisma.request.findMany({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      select: { id: true, status: true, type: true, reason: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const user = dbUser ?? {
    id: authUser.id,
    name: authUser.name || "Member",
    email: authUser.email || "",
    phone: null,
    avatar: null,
    createdAt: new Date(),
    role: { name: "Public User" },
    profile: null,
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
  const completedRequests = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED").length;

  const completion = calculateProfileCompletion({
    name: user.name,
    phone: user.phone,
    profile: user.profile,
  });

  const memberships = [club, school, academy].filter(Boolean) as Array<{
    status: string;
    rejectionReason: string | null;
  }>;
  const activeMemberships = memberships.filter((m) => m.status === "APPROVED" || m.status === "ACTIVE").length;
  const certificateCount = (player?._count.certificates ?? 0) + (coach?._count.certificates ?? 0);
  const pendingCount = [player, coach, club, school, academy].filter(
    (r) => r && r.status === "PENDING"
  ).length;

  // Recent Activity audit logs
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

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
  const firstName = (user.name || "Member").split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-lg">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={68}
                  height={68}
                  className="h-16 w-16 rounded-2xl border-2 border-amber-400/60 object-cover shadow-md sm:h-18 sm:w-18"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md sm:h-18 sm:w-18">
                  {initial}
                </div>
              )}
              <span
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-900 bg-emerald-500 shadow-xs"
                title="Active"
              />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold sm:text-2xl">Welcome back, {firstName}! 👋</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                  <Sparkles className="h-3 w-3" /> Member Portal
                </span>
              </div>
              <p className="text-xs text-slate-300 sm:text-sm">
                Rajasthan Racquetball Association Official Member Dashboard
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Member since {formatDate(user.createdAt)}
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified Sign-in
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700 hover:text-white"
            >
              <Link href="/verify" target="_blank" className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Verify Certificate
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-accent text-slate-950 font-semibold hover:bg-amber-400 shadow-xs"
            >
              <Link href="/account/tournaments" className="flex items-center gap-1.5">
                <Trophy className="h-4 w-4" /> Tournaments
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Completion Card */}
      {completion.percent < 100 ? (
        <Card className="border-amber-200/70 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" /> Profile Completion: {completion.percent}%
                </p>
                <p className="text-xs text-slate-500">
                  Complete all details to easily register for state tournaments and player licenses.
                </p>
              </div>
              <Button size="sm" asChild className="self-start sm:self-auto shrink-0 bg-primary text-white hover:bg-slate-800">
                <Link href="/account/profile" className="flex items-center gap-1.5">
                  Complete Profile <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                style={{ width: `${completion.percent}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {(["name", "phone", "address", "city", "state", "pincode"] as const).map((field) => {
                const isMissing = completion.missing.includes(field);
                return (
                  <span
                    key={field}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium border ${
                      isMissing
                        ? "bg-slate-50 text-slate-500 border-slate-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {isMissing ? (
                      <XCircle className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                    {PROFILE_FIELD_LABELS[field]}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200/70 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40">
          <CardContent className="flex items-center justify-between p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Profile Complete & Verified</p>
                <p className="text-xs text-slate-500">All player and contact credentials are up to date.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
              <Link href="/account/profile">Edit Details</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Core Status & Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Player Status Card */}
        <Card className="transition-all hover:border-blue-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Player Portal</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {player ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={player.status} />
                  <span className="font-mono text-xs font-semibold text-slate-600">{player.playerId}</span>
                </div>
                <p className="text-xs text-slate-400">Registered {formatDate(player.createdAt)}</p>
                {player.status === "REJECTED" && player.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                    Reason: {player.rejectionReason}
                  </p>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="w-full text-xs">
                    <Link href="/account/player">
                      {player.status === "REJECTED" ? "Correct & Resubmit" : "Open Player Portal"}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">No active player registration</p>
                <Button size="sm" asChild className="w-full text-xs bg-primary text-white hover:bg-slate-800">
                  <Link href="/account/player">Register as Player</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coach Status Card */}
        <Card className="transition-all hover:border-amber-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Coach Portal</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {coach ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <StatusBadge status={coach.status} />
                  <span className="font-mono text-xs font-semibold text-slate-600">{coach.coachId}</span>
                </div>
                <p className="text-xs text-slate-400">Submitted {formatDate(coach.createdAt)}</p>
                {coach.status === "REJECTED" && coach.rejectionReason && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md border border-red-100">
                    Reason: {coach.rejectionReason}
                  </p>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="w-full text-xs">
                    <Link href="/account/coach">
                      {coach.status === "REJECTED" ? "Correct & Resubmit" : "Open Coach Portal"}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">No active coach registration</p>
                <Button size="sm" variant="outline" asChild className="w-full text-xs">
                  <Link href="/account/coach">Register as Coach</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Memberships Card */}
        <Card className="transition-all hover:border-purple-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Memberships & Affiliations</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {memberships.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">No club or institutional affiliations</p>
                <Button size="sm" variant="outline" asChild className="w-full text-xs">
                  <Link href="/account/memberships">Explore Affiliations</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">{activeMemberships}</span>
                  <span className="text-xs text-slate-500">of {memberships.length} active</span>
                </div>
                <div className="pt-1">
                  <Button variant="outline" size="sm" asChild className="w-full text-xs">
                    <Link href="/account/memberships">Manage Memberships</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificates Card */}
        <Card className="transition-all hover:border-emerald-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Issued Certificates</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{certificateCount}</span>
                <span className="text-xs text-slate-500">official credentials</span>
              </div>
              <div className="pt-1">
                <Button variant="outline" size="sm" asChild className="w-full text-xs">
                  <Link href="/account/certificates">View & Download</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournaments Card */}
        <Card className="transition-all hover:border-red-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Open Tournaments</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{upcomingTournaments}</span>
                <span className="text-xs text-slate-500">events registration open</span>
              </div>
              <div className="pt-1">
                <Button variant="outline" size="sm" asChild className="w-full text-xs">
                  <Link href="/account/tournaments">Browse Tournaments</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Requests & Inquiries Card */}
        <Card className="transition-all hover:border-cyan-300 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Service Requests</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{pendingRequests}</span>
                <span className="text-xs text-slate-500">pending requests</span>
              </div>
              <div className="pt-1">
                <Button variant="outline" size="sm" asChild className="w-full text-xs">
                  <Link href="/account/applications">View Applications</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-primary">Quick Navigation & Portals</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActionCards.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {action.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-primary group-hover:text-amber-600 transition-colors">
                  {action.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{action.desc}</p>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-600 group-hover:text-primary">
                Open <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & Federation Notice */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  <History className="h-4 w-4" />
                </div>
                <CardTitle className="text-base">Recent Account Activity</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/account/applications">All History</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardList className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No activity logged yet</p>
                <p className="text-xs text-slate-400">Applications, certificates, and submissions will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivity.map((log) => (
                  <li key={log.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      <div>
                        <p className="font-medium text-slate-800">
                          {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        <p className="text-[11px] text-slate-400">Module: {log.module}</p>
                      </div>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{formatDate(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Association Contact & Support Notice */}
        <Card className="border-slate-200/80 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldCheck className="h-5 w-5" />
              <CardTitle className="text-base text-white">Federation Support</CardTitle>
            </div>
            <CardDescription className="text-slate-300 text-xs">
              Official Rajasthan Racquetball Association Member Assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-slate-300">
            <p className="leading-relaxed">
              Need assistance with tournament registration, certificate verification, or player district transfers?
            </p>
            <div className="rounded-lg bg-white/10 p-3 backdrop-blur-xs space-y-1">
              <p className="font-semibold text-white">Helpline & Queries</p>
              <p className="text-slate-300">Email: support@rajasthanracquetball.org</p>
              <p className="text-slate-300">State Headquarters: Jaipur, Rajasthan</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
            >
              <Link href="/contact" target="_blank">Contact Association</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
