import { randomInt } from "crypto";
import { hash, compare } from "bcryptjs";
import prisma from "@/infrastructure/database/prisma";
import { sendOtpEmail } from "@/services/email/email-service";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const HASH_ROUNDS = 10;

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Generates, stores (hashed), and emails a fresh OTP. Never returns or logs
 * the plaintext code — it only ever leaves this function inside the email.
 */
export async function generateAndSendOtp(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const otp = generateOtp();
  const otpHash = await hash(otp, HASH_ROUNDS);

  await prisma.emailOtp.create({
    data: {
      email: normalized,
      otpHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtpEmail(normalized, otp);
}

/**
 * Verifies an OTP against the most recent unconsumed, unexpired code for
 * that email. Enforces a per-code attempt cap independent of any request
 * -level rate limiting (this still applies even if the verify endpoint is
 * called directly). Never logs the submitted code.
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();

  const record = await prisma.emailOtp.findFirst({
    where: { email: normalized, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return false;
  if (record.expiresAt < new Date()) return false;
  if (record.attempts >= MAX_ATTEMPTS) return false;

  const isValid = await compare(code, record.otpHash);

  if (!isValid) {
    await prisma.emailOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await prisma.emailOtp.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
