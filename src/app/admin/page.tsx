import Link from "next/link";
import {
  Users,
  UserCheck,
  GraduationCap,
  Trophy,
  Building2,
  Newspaper,
  School,
  Landmark,
  MessageSquare,
  Award,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ClipboardCheck,
  History,
  FileCheck,
  Activity,
  ArrowRight,
  Layers,
  Server,
  KeyRound,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getStats(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const districtWhere = districtId ? { districtId } : {};
    const pendingWhere = { ...districtWhere, status: "PENDING" as const };
    const [
      players,
      coaches,
      tournaments,
      clubMemberships,
      schoolMemberships,
      academyMemberships,
      news,
      playerCerts,
      coachCerts,
      pendingPlayers,
      pendingCoaches,
      pendingClubs,
      pendingSchools,
      pendingAcademies,
      pendingRequests,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.player.count({ where: districtWhere }),
      prisma.coach.count({ where: districtWhere }),
      prisma.tournament.count({ where: districtId ? { districtId } : {} }),
      prisma.clubMembership.count({ where: districtWhere }),
      prisma.schoolMembership.count({ where: districtWhere }),
      prisma.academyMembership.count({ where: districtWhere }),
      prisma.news.count({ where: { isPublished: true } }),
      prisma.playerCertificate.count({ where: { isRevoked: false } }),
      prisma.coachCertificate.count({ where: { isRevoked: false } }),
      prisma.player.count({ where: pendingWhere }),
      prisma.coach.count({ where: pendingWhere }),
      prisma.clubMembership.count({ where: pendingWhere }),
      prisma.schoolMembership.count({ where: pendingWhere }),
      prisma.academyMembership.count({ where: pendingWhere }),
      prisma.request.count({
        where: {
          status: "PENDING",
          ...(districtId ? { OR: [{ player: { districtId } }, { coach: { districtId } }] } : {}),
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          action: true,
          module: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    return {
      players,
      coaches,
      tournaments,
      clubMemberships,
      schoolMemberships,
      academyMemberships,
      news,
      totalCertificates: playerCerts + coachCerts,
      pendingPlayers,
      pendingCoaches,
      pendingClubs,
      pendingSchools,
      pendingAcademies,
      pendingRequests,
      recentAuditLogs,
    };
  } catch {
    return {
      players: 0,
      coaches: 0,
      tournaments: 0,
      clubMemberships: 0,
      schoolMemberships: 0,
      academyMemberships: 0,
      news: 0,
      totalCertificates: 0,
      pendingPlayers: 0,
      pendingCoaches: 0,
      pendingClubs: 0,
      pendingSchools: 0,
      pendingAcademies: 0,
      pendingRequests: 0,
      recentAuditLogs: [],
    };
  }
}

export default async function AdminDashboard() {
  const { districtId, user } = await requireAdminScope();
  const stats = await getStats(districtId);

  const totalPending =
    stats.pendingPlayers +
    stats.pendingCoaches +
    stats.pendingClubs +
    stats.pendingSchools +
    stats.pendingAcademies +
    stats.pendingRequests;

  const totalMemberships =
    stats.clubMemberships + stats.schoolMemberships + stats.academyMemberships;

  const pendingBreakdown = [
    {
      label: "Player Approvals",
      value: stats.pendingPlayers,
      type: "player",
      href: "/admin/applications?type=player&status=PENDING",
      icon: UserCheck,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      label: "Coach Licenses",
      value: stats.pendingCoaches,
      type: "coach",
      href: "/admin/applications?type=coach&status=PENDING",
      icon: GraduationCap,
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
    {
      label: "Club Affiliations",
      value: stats.pendingClubs,
      type: "club",
      href: "/admin/applications?type=club&status=PENDING",
      icon: Building2,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      label: "School Affiliations",
      value: stats.pendingSchools,
      type: "school",
      href: "/admin/applications?type=school&status=PENDING",
      icon: School,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      label: "Academy Affiliations",
      value: stats.pendingAcademies,
      type: "academy",
      href: "/admin/applications?type=academy&status=PENDING",
      icon: Landmark,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      label: "Member Requests",
      value: stats.pendingRequests,
      type: "requests",
      href: "/admin/requests?status=PENDING",
      icon: MessageSquare,
      color: "bg-rose-50 text-rose-600 border-rose-200",
    },
  ];

  const statCards = [
    {
      title: "Total Registered Players",
      value: stats.players,
      href: "/admin/players",
      icon: UserCheck,
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
      description: "State-wide active player licenses",
    },
    {
      title: "Certified State Coaches",
      value: stats.coaches,
      href: "/admin/coaches",
      icon: GraduationCap,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      description: "Certified coaches & instructors",
    },
    {
      title: "Affiliated Institutions",
      value: totalMemberships,
      href: "/admin/memberships",
      icon: Building2,
      iconColor: "text-purple-600 bg-purple-50 border-purple-100",
      description: `${stats.clubMemberships} Clubs · ${stats.schoolMemberships} Schools · ${stats.academyMemberships} Academies`,
    },
    {
      title: "State Tournaments",
      value: stats.tournaments,
      href: "/admin/tournaments",
      icon: Trophy,
      iconColor: "text-red-600 bg-red-50 border-red-100",
      description: "Sanctioned state championships",
    },
    {
      title: "Issued Credentials",
      value: stats.totalCertificates,
      href: "/admin/certificates",
      icon: Award,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      description: "Digitally signed certificates",
    },
    {
      title: "Published Media Articles",
      value: stats.news,
      href: "/admin/media",
      icon: Newspaper,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
      description: "Official press & announcements",
    },
  ];

  const quickActions = [
    {
      title: "Review Applications",
      desc: "Approve or reject pending player, coach, and institutional applications",
      href: "/admin/applications",
      icon: ClipboardCheck,
      badge: `${totalPending} Pending`,
      badgeColor: "bg-red-100 text-red-700",
    },
    {
      title: "Issue Certificates",
      desc: "Generate digitally signed player & coach certificates with QR verification",
      href: "/admin/certificates",
      icon: Award,
      badge: "Signatures Ready",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Tournaments & Events",
      desc: "Schedule state championships, create categories, and track entries",
      href: "/admin/tournaments",
      icon: Trophy,
      badge: "State Sanctioned",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      title: "Member Requests",
      desc: "Handle district change requests, profile updates, and inquiries",
      href: "/admin/requests",
      icon: MessageSquare,
      badge: `${stats.pendingRequests} New`,
      badgeColor: "bg-amber-100 text-amber-700",
    },
    {
      title: "User Management & RBAC",
      desc: "Manage admin users, assign roles, and configure granular permissions",
      href: "/admin/users",
      icon: KeyRound,
      badge: "Super Admin",
      badgeColor: "bg-slate-100 text-slate-700",
    },
    {
      title: "Federation Audit Trail",
      desc: "Review real-time security logs, timestamped actions, and access telemetry",
      href: "/admin/audit-logs",
      icon: History,
      badge: "Real-time",
      badgeColor: "bg-cyan-100 text-cyan-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Command Center Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-red-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold sm:text-2xl tracking-tight">
                RRA State Directorate Command Center
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                <Sparkles className="h-3 w-3" /> State Administration
              </span>
            </div>
            <p className="text-xs text-slate-300 sm:text-sm">
              Rajasthan Racquetball Association central governance, merit approvals, and competition oversight.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Activity className="h-3.5 w-3.5" /> All Services Operational
              </span>
              <span>·</span>
              <span className="text-slate-300 font-medium">
                Scope: {districtId ? "District Administration" : "All Rajasthan Districts (State-wide)"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              size="sm"
              asChild
              className="bg-accent text-slate-950 font-bold hover:bg-amber-400 shadow-sm"
            >
              <Link href="/admin/applications" className="flex items-center gap-1.5">
                <ClipboardCheck className="h-4 w-4" /> Review Queue ({totalPending})
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white"
            >
              <Link href="/admin/certificates" className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-400" /> Issue Credentials
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Action-Required Review Queue Card */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Pending Approvals & Verification Queue</CardTitle>
              <CardDescription className="text-xs">
                {totalPending === 0
                  ? "All application queues are currently clear."
                  : `${totalPending} items awaiting administrative review and certification.`}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/admin/applications?status=PENDING" className="flex items-center gap-1">
              Open Full Queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {pendingBreakdown.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${item.color}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </div>
                    {item.value > 0 && (
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-2xl font-extrabold text-primary">{item.value}</p>
                  <p className="text-xs font-semibold text-slate-600 group-hover:text-primary transition-colors">
                    {item.label}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-semibold text-slate-400 group-hover:text-primary flex items-center gap-0.5">
                  Review <ChevronRight className="h-2.5 w-2.5" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core State Federation Metrics */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-primary">State Federation Telemetry & Records</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group block rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-1 text-3xl font-black text-primary">{card.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${card.iconColor}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{card.description}</span>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-primary flex items-center gap-0.5">
                  Manage <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Action Navigation Tiles */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-primary">Administrative Portals & Tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:bg-primary group-hover:text-white transition-colors">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${action.badgeColor}`}>
                    {action.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-primary group-hover:text-amber-600 transition-colors">
                  {action.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{action.desc}</p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-primary border-t border-slate-100 pt-3">
                Open Management Portal <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Audit Log Timeline & System Infrastructure */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Real-time Audit Trail */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Recent Federation Activity Log</CardTitle>
                <CardDescription className="text-xs">Audit logs and administrator actions</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/admin/audit-logs">View Full Audit Trail</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentAuditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent admin activity logged.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.recentAuditLogs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-accent" />
                      <div>
                        <p className="font-semibold text-slate-800">
                          {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                          <span className="ml-1.5 font-normal text-slate-500">in module {log.module}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          By: {log.user?.name || log.user?.email || "System Admin"}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">{formatDate(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* System Infrastructure Telemetry */}
        <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Server className="h-5 w-5" />
              <CardTitle className="text-base text-white">System Telemetry</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-300">
              Platform & Database Health
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs text-slate-300">
            <div className="rounded-lg bg-white/5 p-3 space-y-2 border border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Build:</span>
                <span className="font-semibold text-white">RRA Portal v1.0 (Next.js 16)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Database Cluster:</span>
                <span className="font-semibold text-emerald-400">PostgreSQL (Prisma ORM)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Security / SSL:</span>
                <span className="font-semibold text-white">256-Bit TLS Encryption</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RBAC Engine:</span>
                <span className="font-semibold text-amber-300">Granular Role System</span>
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white text-xs"
              >
                <Link href="/admin/settings">Manage Federation Settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
