import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";

async function getSettings() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    return prisma.setting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  } catch {
    return [];
  }
}

export default async function AdminSettingsPage() {
  await requireAdminScope(PERMISSIONS.SETTINGS_MANAGE);
  const settings = await getSettings();
  const groups = [...new Set(settings.map((s) => s.group))];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Settings</h1>
        <p className="text-slate-500">System configuration</p>
      </div>
      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="capitalize">{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {settings.filter((s) => s.group === group).map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-sm font-medium text-primary">{setting.key.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">Type: {setting.type}</p>
                    </div>
                    <p className="text-sm font-mono text-slate-700">{setting.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
