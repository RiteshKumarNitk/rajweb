import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Payment gateway abstraction. The only implementation today is a dummy,
 * Razorpay-shaped TEST gateway — no real keys, no real money. A real Razorpay
 * provider implements the same interface (createOrder → Orders API,
 * verifySignature → HMAC of "order_id|payment_id" with the key secret).
 */
export interface PaymentProvider {
  readonly name: string;
  readonly isTest: boolean;
  createOrder(input: { amount: number; receipt: string }): Promise<{
    providerOrderId: string;
    amountPaise: number;
    currency: "INR";
    checkout: Record<string, unknown>;
  }>;
  verifySignature(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean;
}

/** Test-gateway capabilities that only exist on the dummy provider. */
export interface SimulatedGateway extends PaymentProvider {
  /** Plays the gateway's part of a successful payment: issues a payment id + signature. */
  authorize(providerOrderId: string): { providerPaymentId: string; signature: string };
}

function testId(prefix: string): string {
  return `${prefix}_TEST${randomBytes(7).toString("hex").toUpperCase()}`;
}

class DummyRazorpayProvider implements SimulatedGateway {
  readonly name = "dummy-razorpay";
  readonly isTest = true;
  private readonly key: Buffer;

  constructor() {
    // Server-only signing key derived from the auth secret — never sent to the browser.
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-only-dummy-razorpay";
    this.key = createHash("sha256").update(`dummy-razorpay:${secret}`).digest();
  }

  private sign(providerOrderId: string, providerPaymentId: string): string {
    return createHmac("sha256", this.key).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
  }

  async createOrder(input: { amount: number; receipt: string }) {
    const providerOrderId = testId("order");
    const amountPaise = input.amount * 100;
    return {
      providerOrderId,
      amountPaise,
      currency: "INR" as const,
      checkout: {
        key: "rzp_test_DUMMY",
        order_id: providerOrderId,
        amount: amountPaise,
        currency: "INR",
        name: "RRA Equipment Shop",
        description: `Order ${input.receipt}`,
        test_mode: true,
      },
    };
  }

  authorize(providerOrderId: string) {
    const providerPaymentId = testId("pay");
    return { providerPaymentId, signature: this.sign(providerOrderId, providerPaymentId) };
  }

  verifySignature(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean {
    const expected = Buffer.from(this.sign(input.providerOrderId, input.providerPaymentId), "hex");
    const given = Buffer.from(input.signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  }
}

let provider: PaymentProvider | null | undefined;

/** The configured provider; null when payments are switched off (PAYMENT_PROVIDER=disabled). */
export function getPaymentProvider(): PaymentProvider | null {
  if (provider === undefined) {
    provider = process.env.PAYMENT_PROVIDER === "disabled" ? null : new DummyRazorpayProvider();
  }
  return provider;
}

export function isSimulatedGateway(p: PaymentProvider | null): p is SimulatedGateway {
  return !!p && p.isTest && typeof (p as SimulatedGateway).authorize === "function";
}
