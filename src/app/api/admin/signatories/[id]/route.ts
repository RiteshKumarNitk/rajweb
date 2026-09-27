import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS, type SessionUser } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { signatoryUpdateSchema } from "@/modules/certificates/signatory.service";

async function loadScoped(user: SessionUser, id: string | undefined) {
  if (!id) throw AppError.badRequest("Signatory ID is required");
  const signatory = await prisma.certificateSignatory.findUnique({
    where: { id },
    include: { _count: { select: { tournaments: true } } },
  });
  if (!signatory) throw AppError.notFound("Signatory not found");
  // Federation-level signatories (no state) are GLOBAL-only; others by scope.
  assertInScope(user, { stateId: signatory.stateId, districtId: signatory.districtId }, "Signatory not found");
  return signatory;
}

const FIELDS = ["name", "designation", "organization", "signatureImageUrl", "stateId", "districtId", "isActive", "sortOrder"] as const;

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATES_ISSUE);
    const existing = await loadScoped(user, params?.id as string | undefined);
    const data = signatoryUpdateSchema.parse(await request.json());

    const moving = data.stateId !== undefined || data.districtId !== undefined;
    const owner = moving
      ? await resolveOwnership(
          user,
          { stateId: data.stateId, districtId: data.districtId },
          { allowCentral: true, current: { stateId: existing.stateId, districtId: existing.districtId } }
        )
      : { stateId: existing.stateId, districtId: existing.districtId };

    const updated = await prisma.certificateSignatory.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        designation: data.designation,
        organization: data.organization,
        signatureImageUrl: data.signatureImageUrl,
        stateId: owner.stateId,
        districtId: owner.districtId,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    // Issued certificates keep their own snapshot — this only affects future ones.
    const changed = FIELDS.filter((f) => updated[f] !== existing[f]);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "certificates",
      entityId: existing.id,
      entityType: "CertificateSignatory",
      details: {
        event: "SIGNATORY_UPDATED",
        fields: [...changed],
        previousValues: Object.fromEntries(changed.map((f) => [f, existing[f]])),
        newValues: Object.fromEntries(changed.map((f) => [f, updated[f]])),
      },
    });

    return jsonSuccess(updated, requestId, `Signatory "${updated.name}" updated`);
  },
  { module: "admin-signatories", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.CERTIFICATES_ISSUE);
    const existing = await loadScoped(user, params?.id as string | undefined);

    // Assigned to tournaments → deactivate instead (certificates already
    // issued carry their own snapshot and are unaffected either way).
    if (existing._count.tournaments > 0) {
      await prisma.certificateSignatory.update({ where: { id: existing.id }, data: { isActive: false } });
      await createAuditLog({
        userId: user.id,
        action: "UPDATE",
        module: "certificates",
        entityId: existing.id,
        entityType: "CertificateSignatory",
        details: { event: "SIGNATORY_DEACTIVATED", name: existing.name },
      });
      return jsonSuccess(
        { id: existing.id, deleted: false, deactivated: true },
        requestId,
        `"${existing.name}" is assigned to tournaments and was deactivated instead of deleted`
      );
    }

    await prisma.certificateSignatory.delete({ where: { id: existing.id } });
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "certificates",
      entityId: existing.id,
      entityType: "CertificateSignatory",
      details: { event: "SIGNATORY_DELETED", name: existing.name, stateId: existing.stateId, districtId: existing.districtId },
    });
    return jsonSuccess({ id: existing.id, deleted: true }, requestId, `Signatory "${existing.name}" deleted`);
  },
  { module: "admin-signatories", requireCsrf: true }
);
