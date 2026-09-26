import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { cancelPendingOrder } from "@/modules/equipment/purchase.service";

export const POST = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requireAuth();
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Order ID is required");

    const updated = await cancelPendingOrder(id, user.id, false);

    return jsonSuccess(
      { id, status: updated.status },
      requestId,
      `Order ${updated.orderNumber} cancelled`
    );
  },
  { module: "equipment-orders", requireCsrf: true }
);
