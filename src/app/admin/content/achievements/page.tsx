import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { ContentManager, type ContentFieldDef } from "../content-manager";
import { getAdminAchievements } from "../content-data";

export const dynamic = "force-dynamic";

const fields: ContentFieldDef[] = [
  { name: "label", label: "Label", type: "text", required: true, maxLength: 80, placeholder: "Registered Players" },
  { name: "value", label: "Value", type: "text", required: true, maxLength: 20, placeholder: "500+" },
  { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
  { name: "isActive", label: "Active (visible on the home page stats bar)", type: "checkbox", defaultValue: true },
];

export default async function AdminAchievementsPage() {
  await requireAdminScope(PERMISSIONS.CONTENT_READ);
  const records = await getAdminAchievements();

  return (
    <ContentManager
      title="Statistics Bar"
      description='The headline counters shown on the home page (e.g. "33+ District Associations").'
      apiPath="/api/admin/content/achievements"
      fields={fields}
      records={records}
      entityLabel="statistic"
      columns={[{ key: "value", label: "Value" }]}
    />
  );
}
