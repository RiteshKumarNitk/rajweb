import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { equipmentSchema, createEquipmentItem } from "@/modules/equipment/equipment.service";
import { revalidateEquipment } from "@/modules/equipment/public-equipment";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const input = equipmentSchema.parse(await request.json());

    const item = await createEquipmentItem(input);

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
      },
    });

    revalidateEquipment();

    return jsonSuccess({ id: item.id, slug: item.slug }, requestId, `Equipment "${item.name}" created`);
  },
  { module: "admin-equipment", requireCsrf: true }
);
