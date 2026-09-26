import Link from "next/link";
import { cn } from "@/lib/utils";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { ContentManager, type ContentFieldDef } from "../content-manager";
import { getAdminPartners } from "../content-data";

export const dynamic = "force-dynamic";

const TABS = [
  { type: "sponsor", label: "Sponsors" },
  { type: "federation", label: "Federations" },
] as const;

const fields: ContentFieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true, maxLength: 160 },
  {
    name: "logo",
    label: "Logo",
    type: "image",
    maxLength: 500,
    placeholder: "/images/sponsor-logo1.jpeg",
    helpText: "Site /images/… path or external https URL.",
  },
  {
    name: "website",
    label: "Website (optional)",
    type: "url",
    maxLength: 1000,
    placeholder: "https://…",
    helpText: "External http(s) URL; leave empty for none.",
  },
  { name: "order", label: "Sort order", type: "number", defaultValue: 0 },
  { name: "isActive", label: "Active (visible on the home page)", type: "checkbox", defaultValue: true },
];

export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  await requireAdminScope(PERMISSIONS.CONTENT_READ);
  const params = (await searchParams) ?? {};
  const type = params.type === "federation" ? "federation" : "sponsor";
  const records = await getAdminPartners(type);
  const tabLabel = TABS.find((t) => t.type === type)?.label ?? "Sponsors";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.type}
            href={`/admin/content/partners?type=${t.type}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              t.type === type ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <ContentManager
        title={tabLabel}
        description={
          type === "sponsor"
            ? "Sponsor logos shown in the home page \"Proudly Sponsored By\" section."
            : "Governing-body logos shown in the home page federations section."
        }
        apiPath="/api/admin/content/partners"
        fields={fields}
        records={records}
        entityLabel={type === "sponsor" ? "sponsor" : "federation"}
        hasImage
        usesOrderField
      />
    </div>
  );
}
