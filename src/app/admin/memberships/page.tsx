import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { Building2, School, Landmark, CheckCircle2, Clock } from "lucide-react";
import { MembershipsManager, type MembershipRow } from "./memberships-manager";

export const dynamic = "force-dynamic";

async function getMemberships(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const where = districtId ? { districtId } : undefined;
    const [clubs, schools, academies] = await Promise.all([
      prisma.clubMembership.findMany({
        where,
        select: {
          id: true,
          membershipId: true,
          clubName: true,
          status: true,
          createdAt: true,
          district: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.schoolMembership.findMany({
        where,
        select: {
          id: true,
          membershipId: true,
          schoolName: true,
          status: true,
          createdAt: true,
          district: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.academyMembership.findMany({
        where,
        select: {
          id: true,
          membershipId: true,
          academyName: true,
          status: true,
          createdAt: true,
          district: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);
    return {
      clubs: clubs.map((c) => ({
        id: c.id,
        membershipId: c.membershipId,
        name: c.clubName,
        district: c.district.name,
        status: c.status,
        type: "club" as const,
        createdAt: c.createdAt.toISOString(),
      })),
      schools: schools.map((s) => ({
        id: s.id,
        membershipId: s.membershipId,
        name: s.schoolName,
        district: s.district.name,
        status: s.status,
        type: "school" as const,
        createdAt: s.createdAt.toISOString(),
      })),
      academies: academies.map((a) => ({
        id: a.id,
        membershipId: a.membershipId,
        name: a.academyName,
        district: a.district.name,
        status: a.status,
        type: "academy" as const,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  } catch {
    return { clubs: [], schools: [], academies: [] };
  }
}

export default async function AdminMembershipsPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.MEMBERSHIPS_READ);
  const { clubs, schools, academies } = await getMemberships(districtId);

  const totalAffiliations = clubs.length + schools.length + academies.length;
  const pendingClubs = clubs.filter((c) => c.status === "PENDING").length;
  const pendingSchools = schools.filter((s) => s.status === "PENDING").length;
  const pendingAcademies = academies.filter((a) => a.status === "PENDING").length;
  const totalPending = pendingClubs + pendingSchools + pendingAcademies;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Institutional Affiliations
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Official sports clubs, accredited schools, and private coaching academies affiliated with RRA.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Affiliations</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalAffiliations}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Institutional partners</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Sports Clubs</p>
                <h3 className="text-2xl font-bold text-blue-600 mt-1">{clubs.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{pendingClubs} pending reviews</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Schools</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{schools.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <School className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{pendingSchools} pending reviews</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Academies</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{academies.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Landmark className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">{pendingAcademies} pending reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All Institutional Units</CardTitle>
          <CardDescription className="text-xs">
            Manage club, school, and academy affiliation requests, certificates, and compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <MembershipsManager clubs={clubs} schools={schools} academies={academies} />
        </CardContent>
      </Card>
    </div>
  );
}
