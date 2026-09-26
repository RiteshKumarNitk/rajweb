import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { MapPin, Users, GraduationCap, Building2, Trophy, Phone, Mail, ShieldCheck } from "lucide-react";
import { DistrictCardActions, type DistrictRow } from "./district-card-actions";

export const dynamic = "force-dynamic";

async function getDistricts(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.district.findMany({
      where: districtId ? { id: districtId } : undefined,
      include: {
        _count: {
          select: {
            players: true,
            coaches: true,
            clubMemberships: true,
            schoolMemberships: true,
            academyMemberships: true,
            tournaments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function AdminDistrictsPage() {
  const { user, districtId } = await requireAdminScope(PERMISSIONS.DISTRICTS_READ);
  const districts = await getDistricts(districtId);

  // District-scoped admins may only edit their own district; management
  // actions are enforced again server-side by the API (districts:manage +
  // assertDistrictAccess).
  const canManage = hasPermission(user, PERMISSIONS.DISTRICTS_MANAGE);

  const totalDistricts = districts.length;
  const activeDistricts = districts.filter((d) => d.isActive).length;
  const totalPlayersInDistricts = districts.reduce((acc, d) => acc + d._count.players, 0);
  const totalTournamentsHosted = districts.reduce((acc, d) => acc + d._count.tournaments, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">District Associations</h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {districtId ? "District Scoped" : "Federation Wide"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Governing district units, local association leadership, and regional membership coverage.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Districts</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalDistricts}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Official geographical units</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Active Units</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeDistricts}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">Operational committees</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">District Athletes</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{totalPlayersInDistricts}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Total regional players</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Events Hosted</p>
                <h3 className="text-2xl font-bold text-primary mt-1">{totalTournamentsHosted}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <Trophy className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">District championships</p>
          </CardContent>
        </Card>
      </div>

      {/* District Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {districts.map((d) => {
          const totalAffiliations =
            d._count.clubMemberships + d._count.schoolMemberships + d._count.academyMemberships;

          return (
            <Card
              key={d.id}
              className="overflow-hidden border-slate-200/80 transition-all hover:border-blue-300 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-primary flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-red-500" />
                        {d.name}
                      </CardTitle>
                      <CardDescription className="text-xs">District Racquetball Unit</CardDescription>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        d.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-slate-600">
                  {/* Leadership Section */}
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">President:</span>
                      <span className="font-semibold text-slate-800">{d.president || "Pending Appointment"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Secretary:</span>
                      <span className="font-semibold text-slate-800">{d.secretary || "Pending Appointment"}</span>
                    </div>
                  </div>

                  {/* Telemetry Stats Chips */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="rounded-md bg-blue-50/60 p-2 border border-blue-100">
                      <p className="text-[10px] text-blue-600 font-semibold uppercase">Players</p>
                      <p className="text-sm font-bold text-blue-900 mt-0.5">{d._count.players}</p>
                    </div>

                    <div className="rounded-md bg-amber-50/60 p-2 border border-amber-100">
                      <p className="text-[10px] text-amber-700 font-semibold uppercase">Coaches</p>
                      <p className="text-sm font-bold text-amber-900 mt-0.5">{d._count.coaches}</p>
                    </div>

                    <div className="rounded-md bg-emerald-50/60 p-2 border border-emerald-100">
                      <p className="text-[10px] text-emerald-700 font-semibold uppercase">Affiliations</p>
                      <p className="text-sm font-bold text-emerald-900 mt-0.5">{totalAffiliations}</p>
                    </div>
                  </div>
                </CardContent>
              </div>

              {(d.email || d.phone) && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                  {d.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" /> {d.email}
                    </span>
                  )}
                  {d.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> {d.phone}
                    </span>
                  )}
                </div>
              )}

              {canManage && (
                <div className="border-t border-slate-100 p-3">
                  <DistrictCardActions
                    district={{
                      id: d.id,
                      name: d.name,
                      slug: d.slug,
                      isActive: d.isActive,
                      president: d.president,
                      secretary: d.secretary,
                      email: d.email,
                      phone: d.phone,
                      address: d.address,
                    } satisfies DistrictRow}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
