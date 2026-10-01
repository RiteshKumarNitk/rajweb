import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { cancelPayment, providerOrderSchema } from "@/modules/payments/equipment-payment.service";

/** The member closed the checkout without paying. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const { providerOrderId } = providerOrderSchema.parse(await request.json());
    return jsonSuccess(await cancelPayment(user.id, providerOrderId), requestId, "Payment cancelled");
  },
  { module: "account-equipment-payment", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
