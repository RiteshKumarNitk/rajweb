import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { ContentManager, type ContentFieldDef } from "../content-manager";
import { getAdminCommittee } from "../content-data";

export const dynamic = "force-dynamic";

const fields: ContentFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true, maxLength: 120 },
  { name: "designation", label: "Designation", type: "text", required: true, maxLength: 160 },
  {
    name: "photo",
    label: "Photo",
    type: "image",
    maxLength: 500,
    placeholder: "/images/rra/portrait-….jpg or https://…",
    helpText: "Site /images/… path or external https URL. Leave empty for no photo.",
  },
  { name: "bio", label: "Description", type: "textarea", maxLength: 1000 },
  {
    name: "badge",
    label: "Badge",
    type: "text",
    maxLength: 60,
    helpText: "Optional accent badge (e.g. \"Support By RRA\"). Leave empty for none.",
  },
  { name: "sortOrder", label: "Sort order", type: "number", defaultValue: 0 },
  { name: "isActive", label: "Active (visible on the public committee page)", type: "checkbox", defaultValue: true },
];

export default async function AdminCommitteePage() {
  await requireAdminScope(PERMISSIONS.CONTENT_READ);
  const records = await getAdminCommittee();

  return (
    <ContentManager
      title="Executive Committee"
      description="Members shown on the public Executive Committee page."
      apiPath="/api/admin/content/committee"
      fields={fields}
      records={records}
      entityLabel="member"
      hasImage
      columns={[{ key: "designation", label: "Designation" }]}
    />
  );
}
