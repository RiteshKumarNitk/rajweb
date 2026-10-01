import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { verifyPayment, verifyPaymentSchema } from "@/modules/payments/equipment-payment.service";

/** Server-side payment verification — the only way an order becomes paid. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const input = verifyPaymentSchema.parse(await request.json());
    const result = await verifyPayment(user.id, input);
    return jsonSuccess(result, requestId, `Payment confirmed — order ${result.orderNumber} placed`);
  },
  { module: "account-equipment-payment", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
