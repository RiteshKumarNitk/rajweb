import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { signatoryInputSchema } from "@/modules/certificates/signatory.service";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATES_ISSUE);
    const data = signatoryInputSchema.parse(await request.json());

    // District admins register their district's officials, state admins their
    // state's (or a district in it); only GLOBAL may create federation-level ones.
    const owner = await resolveOwnership(user, { stateId: data.stateId, districtId: data.districtId }, { allowCentral: true });

    const signatory = await prisma.certificateSignatory.create({
      data: {
        name: data.name,
        designation: data.designation,
        organization: data.organization ?? null,
        signatureImageUrl: data.signatureImageUrl ?? null,
        stateId: owner.stateId,
        districtId: owner.districtId,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "certificates",
      entityId: signatory.id,
      entityType: "CertificateSignatory",
      details: { event: "SIGNATORY_CREATED", name: signatory.name, designation: signatory.designation, ...owner },
    });

    return jsonSuccess({ id: signatory.id }, requestId, `Signatory "${signatory.name}" added`);
  },
  { module: "admin-signatories", requireCsrf: true }
);
