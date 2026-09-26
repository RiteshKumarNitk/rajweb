import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import prisma from "@/infrastructure/database/prisma";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import {
  equipmentUpdateSchema,
  updateEquipmentItem,
  deleteOrArchiveEquipmentItem,
} from "@/modules/equipment/equipment.service";
import { revalidateEquipment } from "@/modules/equipment/public-equipment";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Equipment ID is required");

    const existing = await prisma.equipmentItem.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Equipment not found");

    const input = equipmentUpdateSchema.parse(await request.json());
    const updated = await updateEquipmentItem(id, input);

    const activated = input.isActive === true && !existing.isActive;
    const deactivated = input.isActive === false && existing.isActive;
    const priceChanged = input.price !== undefined && input.price !== existing.price;
    const stockChanged = input.stockQuantity !== undefined && input.stockQuantity !== existing.stockQuantity;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "equipment",
      entityId: id,
      entityType: "EquipmentItem",
      details: {
        event: activated
          ? "EQUIPMENT_ITEM_ACTIVATED"
          : deactivated
            ? "EQUIPMENT_ITEM_DEACTIVATED"
            : "EQUIPMENT_ITEM_UPDATED",
        name: updated.name,
        ...(priceChanged ? { event2: "EQUIPMENT_PRICE_CHANGED", previousValue: existing.price, newValue: input.price } : {}),
        ...(stockChanged ? { event3: "EQUIPMENT_STOCK_CHANGED", previousValue: existing.stockQuantity, newValue: input.stockQuantity } : {}),
      },
    });

    revalidateEquipment();

    return jsonSuccess(
      { id, isActive: updated.isActive, price: updated.price, stockQuantity: updated.stockQuantity },
      requestId,
      `Equipment "${updated.name}" updated`
    );
  },
  { module: "admin-equipment", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Equipment ID is required");

    const existing = await prisma.equipmentItem.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Equipment not found");

    // Items referenced by orders are archived (deactivated), not destroyed —
    // historical orders must stay valid forever.
    const result = await deleteOrArchiveEquipmentItem(id);

    await createAuditLog({
      userId: user.id,
      action: result === "deleted" ? "DELETE" : "UPDATE",
      module: "equipment",
      entityId: id,
      entityType: "EquipmentItem",
      details: {
        event: result === "deleted" ? "EQUIPMENT_ITEM_DELETED" : "EQUIPMENT_ITEM_ARCHIVED",
        name: existing.name,
      },
    });

    revalidateEquipment();

    return jsonSuccess(
      { id, deleted: result === "deleted", archived: result === "archived" },
      requestId,
      result === "deleted"
        ? `Equipment "${existing.name}" deleted`
        : `Equipment "${existing.name}" has existing orders and was deactivated instead of deleted`
    );
  },
  { module: "admin-equipment", requireCsrf: true }
);
