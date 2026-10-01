import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { createRequirement, createRequirementSchema } from "@/modules/equipment/requirement.service";

/** Raise an equipment requirement for a district (District Admins: always their own). */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const input = createRequirementSchema.parse(await request.json());
    const requirement = await createRequirement(user, input);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "equipment",
      entityId: requirement.id,
      entityType: "EquipmentRequirement",
      details: {
        event: "EQUIPMENT_REQUIREMENT_CREATED",
        requirementNumber: requirement.requirementNumber,
        itemName: requirement.itemName,
        quantity: requirement.quantity,
        stateId: requirement.stateId,
        districtId: requirement.districtId,
      },
    });

    return jsonSuccess({ id: requirement.id, requirementNumber: requirement.requirementNumber }, requestId, `Requirement ${requirement.requirementNumber} submitted`);
  },
  { module: "admin-equipment-requirements", rateLimit: { limit: 30, windowMs: 60000 }, requireCsrf: true }
);
