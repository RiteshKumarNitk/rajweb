import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { createEquipmentOrder } from "@/modules/equipment/equipment-order.service";

const equipmentOrderSchema = z.object({
  name: z.string().min(2).max(100),
  mobile: z.string().min(10).max(20),
  address: z.string().min(10).max(500),
  district: z.string().min(1).max(100),
  equipment: z.string().min(2).max(120),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = equipmentOrderSchema.parse(body);
    const order = await createEquipmentOrder(data);
    return jsonSuccess(
      { orderId: order.id },
      requestId,
      "Thank you! Your request has been received. Our admin team will contact you shortly."
    );
  },
  { module: "equipment-orders", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
