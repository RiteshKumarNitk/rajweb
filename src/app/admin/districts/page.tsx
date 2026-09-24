import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

async function getDistricts(districtId?: string) {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.district.findMany({
      where: districtId ? { id: districtId } : undefined,
      orderBy: { name: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function AdminDistrictsPage() {
  const { districtId } = await requireAdminScope(PERMISSIONS.DISTRICTS_READ);
  const districts = await getDistricts(districtId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">District Associations</h1>
        <p className="text-slate-500">{districts.length} districts in Rajasthan</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {districts.map((d) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              <p>President: {d.president || "Not assigned"}</p>
              <p>Secretary: {d.secretary || "Not assigned"}</p>
              <p className="mt-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
