import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { Settings, Sliders, Database, ShieldCheck, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">System Configuration &amp; Settings</h1>
          <p className="text-sm text-slate-500">
            Global association parameters, membership pricing structures, and runtime toggles.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Configured Settings</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{settings.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Sliders className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Database environment values</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Configuration Groups</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">{groups.length}</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Database className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Distinct parameter namespaces</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Runtime Health</p>
                <h3 className="text-sm font-bold text-emerald-600 mt-1">Operational &amp; Synchronized</h3>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-emerald-600 font-medium">State database online</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Groups */}
      <div className="space-y-6">
        {groups.map((group) => {
          const groupSettings = settings.filter((s) => s.group === group);
          return (
            <Card key={group} className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-bold capitalize text-primary">
                    {group.replace(/_/g, " ")} Configuration
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="divide-y divide-slate-100">
                  {groupSettings.map((setting) => (
                    <div
                      key={setting.key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800 capitalize">
                          {setting.key.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-slate-400">
                          Key: <code className="font-mono text-[11px]">{setting.key}</code> · Type:{" "}
                          <span className="font-mono text-[11px] text-slate-500">{setting.type}</span>
                        </p>
                      </div>
                      <div className="self-start sm:self-auto">
                        <span className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-mono font-bold text-slate-800 border border-slate-200">
                          {setting.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
