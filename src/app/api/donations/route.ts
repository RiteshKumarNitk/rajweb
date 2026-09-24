import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { sanitizeEmail, sanitizeOptionalText, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("donations");

const donationSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254).optional(),
  mobile: z.string().max(20).optional(),
  amount: z.number().positive().max(10000000),
  message: z.string().max(1000).optional(),
  isAnonymous: z.boolean().optional(),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = donationSchema.parse(body);

    await prisma.donation.create({
      data: {
        name: data.isAnonymous ? "Anonymous" : sanitizeText(data.name),
        email: data.email ? sanitizeEmail(data.email) : undefined,
        mobile: data.mobile ? sanitizePhone(data.mobile) : undefined,
        amount: data.amount,
        message: sanitizeOptionalText(data.message),
        isAnonymous: data.isAnonymous ?? false,
      },
    });

    log.info({ amount: data.amount }, "Donation recorded");
    return jsonSuccess({ recorded: true }, requestId, "Thank you for your donation!");
  },
  { module: "donations", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
