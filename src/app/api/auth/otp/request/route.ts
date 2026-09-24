import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { checkRateLimit } from "@/security/rate-limit";
import { generateAndSendOtp } from "@/services/email/otp-service";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("auth-otp");

const requestOtpSchema = z.object({
  email: z.string().email().max(254),
});

const GENERIC_MESSAGE = "If this email can receive a code, we've sent it.";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const { email } = requestOtpSchema.parse(body);
    const normalized = email.trim().toLowerCase();

    // Per-email limit in addition to the per-IP limit below — otherwise a
    // rotating-IP attacker could still flood one inbox with OTP emails.
    const emailAllowed = await checkRateLimit(`otp-request-email:${normalized}`, 3, 10 * 60 * 1000);
    if (!emailAllowed) {
      // Same generic response as success — never reveal whether the email
      // exists or whether it's just rate-limited.
      return jsonSuccess({ sent: true }, requestId, GENERIC_MESSAGE);
    }

    try {
      await generateAndSendOtp(normalized);
    } catch (err) {
      log.error({ err }, "Failed to send OTP email");
      // Still return the generic message — don't leak configuration state
      // (e.g. "email service not configured") to an unauthenticated caller.
      // The error itself is logged server-side for operators to see.
    }

    return jsonSuccess({ sent: true }, requestId, GENERIC_MESSAGE);
  },
  {
    module: "auth-otp-request",
    rateLimit: { limit: 10, windowMs: 10 * 60 * 1000 },
    requireCsrf: true,
  }
);
