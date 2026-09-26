import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { ContentManager, type ContentFieldDef } from "../content-manager";
import { getAdminTimeline } from "../content-data";

export const dynamic = "force-dynamic";

const fields: ContentFieldDef[] = [
  { name: "year", label: "Year", type: "text", required: true, maxLength: 10, placeholder: "2025" },
  { name: "title", label: "Title", type: "text", required: true, maxLength: 120, placeholder: "RRA Established" },
  { name: "description", label: "Description", type: "textarea", required: true, maxLength: 500 },
  { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
  { name: "isActive", label: "Active (visible in the public history timeline)", type: "checkbox", defaultValue: true },
];

export default async function AdminTimelinePage() {
  await requireAdminScope(PERMISSIONS.CONTENT_READ);
  const records = await getAdminTimeline();

  return (
    <ContentManager
      title="History Timeline"
      description="Key milestones shown on the public RRA History page."
      apiPath="/api/admin/content/timeline"
      fields={fields}
      records={records}
      entityLabel="milestone"
      columns={[{ key: "year", label: "Year" }]}
    />
  );
}
