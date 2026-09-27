import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { equipmentSchema, createEquipmentItem } from "@/modules/equipment/equipment.service";
import { revalidateEquipment } from "@/modules/equipment/public-equipment";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const input = equipmentSchema.parse(await request.json());

    // Inventory owner from the caller's scope: district admins always stock
    // their own district, state admins their state (or a district in it);
    // only GLOBAL may stock the RRA central store (no state/district).
    const owner = await resolveOwnership(user, { stateId: input.stateId, districtId: input.districtId }, { allowCentral: true });
    const item = await createEquipmentItem(input, owner);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "equipment",
      entityId: item.id,
      entityType: "EquipmentItem",
      details: {
        event: "EQUIPMENT_ITEM_CREATED",
        name: item.name,
        price: item.price,
        stockQuantity: item.stockQuantity,
        isActive: item.isActive,
        stateId: owner.stateId,
        districtId: owner.districtId,
      },
    });

    revalidateEquipment();

    return jsonSuccess({ id: item.id, slug: item.slug }, requestId, `Equipment "${item.name}" created`);
  },
  { module: "admin-equipment", requireCsrf: true }
);
