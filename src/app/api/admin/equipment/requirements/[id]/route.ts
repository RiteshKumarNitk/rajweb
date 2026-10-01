import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import {
  deleteRequirement,
  reviewRequirement,
  reviewRequirementSchema,
  updateRequirement,
  updateRequirementSchema,
} from "@/modules/equipment/requirement.service";

/**
 * PATCH with `status` = review (State Admin / Super Admin, allowed moves only);
 * otherwise an edit of a still-pending requirement. Out-of-scope ids → 404.
 */
export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const id = String(params?.id ?? "");
    if (!id) throw AppError.badRequest("Requirement ID is required");
    const body = await request.json();

    if (body && typeof body === "object" && "status" in body) {
      const input = reviewRequirementSchema.parse(body);
      const reviewed = await reviewRequirement(user, id, input);
      await createAuditLog({
        userId: user.id,
        action: input.status === "REJECTED" ? "REJECT" : input.status === "APPROVED" ? "APPROVE" : "UPDATE",
        module: "equipment",
        entityId: id,
        entityType: "EquipmentRequirement",
        details: { event: "EQUIPMENT_REQUIREMENT_REVIEWED", requirementNumber: reviewed.requirementNumber, newValue: input.status, stateId: reviewed.stateId, districtId: reviewed.districtId },
      });
      return jsonSuccess({ id, status: input.status }, requestId, `Requirement ${reviewed.requirementNumber} marked ${input.status.replace("_", " ").toLowerCase()}`);
    }

    const input = updateRequirementSchema.parse(body);
    const updated = await updateRequirement(user, id, input);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "equipment",
      entityId: id,
      entityType: "EquipmentRequirement",
      details: { event: "EQUIPMENT_REQUIREMENT_UPDATED", fields: Object.keys(input), stateId: updated.stateId, districtId: updated.districtId },
    });
    return jsonSuccess({ id }, requestId, "Requirement updated");
  },
  { module: "admin-equipment-requirements", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const id = String(params?.id ?? "");
    const removed = await deleteRequirement(user, id);
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "equipment",
      entityId: id,
      entityType: "EquipmentRequirement",
      details: { event: "EQUIPMENT_REQUIREMENT_DELETED", requirementNumber: removed.requirementNumber, stateId: removed.stateId, districtId: removed.districtId },
    });
    return jsonSuccess({ id }, requestId, "Requirement deleted");
  },
  { module: "admin-equipment-requirements", requireCsrf: true }
);
