import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { simulateGateway, simulateSchema } from "@/modules/payments/equipment-payment.service";

/** TEST gateway checkout outcome (success / failure). Exists only while the dummy provider is active. */
export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const input = simulateSchema.parse(await request.json());
    return jsonSuccess(await simulateGateway(user.id, input), requestId);
  },
  { module: "account-equipment-payment", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
