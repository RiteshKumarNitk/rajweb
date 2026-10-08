import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { ASSET_CATEGORIES, assetUrl, listAssets, listTemplates } from "@/modules/certificates/certificate-template.service";
import { TemplatesManager } from "./templates-manager";

export const dynamic = "force-dynamic";

/**
 * Certificate templates (versioned designs) and their image library. Anyone
 * with certificates:read can see and preview them; only
 * certificate-templates:manage (Super Admin by default) can change them.
 */
export default async function CertificateTemplatesPage() {
  const { user } = await requireAdminScope(PERMISSIONS.CERTIFICATES_READ);
  const canManage = hasPermission(user, PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE);
  const [templates, assets] = await Promise.all([listTemplates(), canManage ? listAssets() : Promise.resolve([])]);

  return (
    <div className="space-y-6">
      <Link href="/admin/certificates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Certificates
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Certificate Templates</h1>
        <p className="text-sm text-slate-500">
          One design, many certificates. A version that has issued certificates is locked — changes are saved as a new version, and every issued
          certificate keeps the version it was issued with.
        </p>
      </div>
      <TemplatesManager
        canManage={canManage}
        templates={templates.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
        assets={assets.map((a) => ({ id: a.id, name: a.name, category: a.category, isActive: a.isActive, url: assetUrl(a), source: a.imagePath ? "Site file" : "Uploaded" }))}
        assetCategories={[...ASSET_CATEGORIES]}
      />
    </div>
  );
}
