import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { ContentManager, type ContentFieldDef } from "../content-manager";
import { getAdminNews } from "../content-data";

export const dynamic = "force-dynamic";

const fields: ContentFieldDef[] = [
  { name: "title", label: "Title", type: "text", required: true, maxLength: 200 },
  { name: "category", label: "Category", type: "text", maxLength: 60, placeholder: "Announcement / Tournament / Development" },
  { name: "excerpt", label: "Excerpt", type: "textarea", maxLength: 500 },
  { name: "content", label: "Content", type: "textarea", required: true, maxLength: 10000 },
  { name: "author", label: "Author", type: "text", maxLength: 100 },
  { name: "isActive", label: "Active (visible on the public newsfeed)", type: "checkbox", defaultValue: true },
];

export default async function AdminNewsPage() {
  await requireAdminScope(PERMISSIONS.CONTENT_READ);
  const records = await getAdminNews();

  return (
    <ContentManager
      title="News & Updates"
      description="Announcements shown on the home feed and the public news page."
      apiPath="/api/admin/content/news"
      fields={fields}
      records={records}
      entityLabel="news item"
      columns={[{ key: "category", label: "Category" }]}
    />
  );
}
