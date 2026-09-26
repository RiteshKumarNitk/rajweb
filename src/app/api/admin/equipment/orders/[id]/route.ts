import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { adminOrderUpdateSchema, adminUpdateOrderStatus } from "@/modules/equipment/purchase.service";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.EQUIPMENT_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Order ID is required");

    const { status } = adminOrderUpdateSchema.parse(await request.json());
    const updated = await adminUpdateOrderStatus(id, status, user.id);

    return jsonSuccess(
      { id, status: updated.status, paymentStatus: updated.paymentStatus },
      requestId,
      `Order ${updated.orderNumber} updated`
    );
  },
  { module: "admin-equipment-orders", requireCsrf: true }
);
