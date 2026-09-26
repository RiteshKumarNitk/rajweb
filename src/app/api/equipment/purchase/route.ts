import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { purchaseSchema, createPurchaseOrder } from "@/modules/equipment/purchase.service";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const input = purchaseSchema.parse(await request.json());

    const order = await createPurchaseOrder(user.id, input);

    return jsonSuccess(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        items: order.items.map((i) => ({
          name: i.productNameSnapshot,
          quantity: i.quantity,
          lineTotal: i.lineTotal,
        })),
      },
      requestId,
      `Order ${order.orderNumber} placed — pending payment`
    );
  },
  { module: "equipment-purchase", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
