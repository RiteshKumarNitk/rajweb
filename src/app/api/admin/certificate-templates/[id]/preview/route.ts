import { NextResponse } from "next/server";
import { withApiHandler, AppError } from "@/core/api/with-api-handler";
import { requireAnyPermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { isGlobalScope } from "@/security/rbac/org-scope";
import { previewTemplate } from "@/services/certificates/tournament-certificates.service";

/**
 * Stamped preview PDF of a template version. Federation-wide viewers see the
 * latest real certificate re-dressed in the template; everyone else sees
 * labelled sample data (never another scope's player).
 */
export const GET = withApiHandler(
  async (_request, { params }) => {
    const user = await requireAnyPermission([PERMISSIONS.CERTIFICATE_TEMPLATES_MANAGE, PERMISSIONS.CERTIFICATES_READ]);
    const id = String(params?.id ?? "");
    if (!/^[a-z0-9]{10,40}$/i.test(id)) throw AppError.notFound("Template not found");
    const pdf = await previewTemplate(id, { allowRealData: isGlobalScope(user) });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="template-preview.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },
  { module: "admin-certificate-templates", rateLimit: { limit: 30, windowMs: 60000 } }
);
