import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { startPayment } from "@/modules/payments/equipment-payment.service";

const schema = z.object({ orderId: z.string().min(1) });

/** Creates a (TEST) gateway order for one of the member's unpaid orders. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const { orderId } = schema.parse(await request.json());
    return jsonSuccess(await startPayment(user.id, orderId), requestId);
  },
  { module: "account-equipment-payment", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
