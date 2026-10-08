import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { AppError } from "@/core/errors/app-error";
import { assetUrl, getTemplate, listAssets } from "@/modules/certificates/certificate-template.service";
import { DEFAULT_TEMPLATE_CONFIG, DATE_FORMATS, OPTION_DISPLAYS, PLACEHOLDERS } from "@/services/certificates/templates/template-config";
import { CERTIFICATE_LAYOUTS, DEFAULT_LAYOUT } from "@/services/certificates/templates/generate-certificate";
import { CERTIFICATE_ACHIEVEMENTS } from "@/services/certificates/templates/positions";
import { TemplateEditor } from "./template-editor";

export const dynamic = "force-dynamic";

/** Structured editor for one template version ("new" = a new template family). */
export default async function CertificateTemplateEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminScope(PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE);
  const { id } = await params;

  let template: Awaited<ReturnType<typeof getTemplate>> | null = null;
  if (id !== "new") {
    try {
      template = await getTemplate(id);
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) notFound();
      throw err;
    }
  }
  const assets = await listAssets();

  return (
    <div className="space-y-6">
      <Link href="/admin/certificates/templates" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          {template ? `${template.name} — v${template.version}` : "New certificate template"}
        </h1>
        {template && template._count.certificates > 0 && (
          <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            {template._count.certificates} certificate(s) were issued with this version, so it is locked. Your changes will be saved as version{" "}
            {template.version + 1}; issued certificates keep version {template.version}.
          </p>
        )}
      </div>
      <TemplateEditor
        template={
          template
            ? {
                id: template.id,
                name: template.name,
                description: template.description,
                version: template.version,
                layout: template.layout,
                locked: template._count.certificates > 0,
                tournamentCount: template._count.tournaments,
                config: template.config,
              }
            : null
        }
        defaultConfig={DEFAULT_TEMPLATE_CONFIG}
        assets={assets.map((a) => ({ id: a.id, name: a.name, category: a.category, isActive: a.isActive, url: assetUrl(a) }))}
        achievements={CERTIFICATE_ACHIEVEMENTS.map((a) => ({ code: a.code, label: a.label }))}
        dateFormats={Object.entries(DATE_FORMATS).map(([value, example]) => ({ value, example }))}
        layouts={Object.entries(CERTIFICATE_LAYOUTS).map(([value, l]) => ({ value, label: l.label }))}
        defaultLayout={DEFAULT_LAYOUT}
        optionDisplays={Object.entries(OPTION_DISPLAYS).map(([value, label]) => ({ value, label }))}
        placeholders={PLACEHOLDERS}
      />
    </div>
  );
}
