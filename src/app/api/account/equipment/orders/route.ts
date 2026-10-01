import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { checkoutSchema, createPurchaseOrder } from "@/modules/equipment/purchase.service";
import { getMemberHome } from "@/modules/account/member-home.server";

/** Member checkout: creates an unpaid order from the member's own district catalog. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const input = checkoutSchema.parse(await request.json());
    if (!(await getMemberHome(user.id)).onboarded) {
      throw AppError.badRequest("Complete your registration (State and District) before ordering equipment.");
    }

    const order = await createPurchaseOrder(user.id, input);
    return jsonSuccess(
      { id: order.id, orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus, total: order.total },
      requestId,
      `Order ${order.orderNumber} created — complete the payment to place it`
    );
  },
  { module: "account-equipment-orders", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
