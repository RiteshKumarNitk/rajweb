import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { createContactMessage } from "@/modules/contact/contact.service";

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().max(20).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().min(10).max(5000),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = contactSchema.parse(body);
    await createContactMessage(data);
    return jsonSuccess({ submitted: true }, requestId, "Message sent successfully");
  },
  { module: "contact", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
