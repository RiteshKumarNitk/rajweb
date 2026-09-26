import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { GraduationCap, UserCheck, Clock, Award, ShieldCheck } from "lucide-react";
import { CoachesTable, type CoachRow } from "./coaches-table";

export const dynamic = "force-dynamic";

async function getCoaches(districtId?: string): Promise<CoachRow[]> {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const rows = await prisma.coach.findMany({
      where: districtId ? { districtId } : undefined,
      include: { district: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return rows.map((c) => ({
      id: c.id,
      coachId: c.coachId,
      name: c.name,
      email: c.email,
      mobile: c.mobile,
      qualification: c.qualification,
      certificationLevel: c.certificationLevel,
      district: c.district.name,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function AdminCoachesPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.COACHES_READ);
  const coaches = await getCoaches(districtId);

  const totalCoaches = coaches.length;
  const approvedCoaches = coaches.filter((c) => c.status === "APPROVED").length;
  const pendingCoaches = coaches.filter((c) => c.status === "PENDING").length;
  const advancedCoaches = coaches.filter(
    (c) => c.certificationLevel.includes("LEVEL_3") || c.certificationLevel.includes("INTERNATIONAL")
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Coaching Staff Registry</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Certified technical coaches, license accreditation levels, and grassroots training officials across Rajasthan.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Coaches</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCoaches}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <GraduationCap className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">RRA coaching roster</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Licensed</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approvedCoaches}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Accredited state coaches</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingCoaches}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-amber-600 font-medium">Awaiting qualification review</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">International / L3</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{advancedCoaches}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100/80 text-amber-700">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Master coaches &amp; directors</p>
          </CardContent>
        </Card>
      </div>

      {/* Coaches Main Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="text-base font-bold text-primary">All Registered Coaches</CardTitle>
          <CardDescription className="text-xs">
            Review coach profiles, accreditation credentials, and manage license approvals.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <CoachesTable coaches={coaches} />
        </CardContent>
      </Card>
    </div>
  );
}
