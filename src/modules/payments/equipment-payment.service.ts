import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createAuditLog } from "@/services/audit/audit-service";
import { verifyAndMarkPaid } from "@/modules/equipment/purchase.service";
import { getPaymentProvider, isSimulatedGateway } from "@/modules/payments/payment-provider";

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i, "Invalid payment signature"),
});

export const simulateSchema = z.object({
  providerOrderId: z.string().min(1).max(100),
  outcome: z.enum(["success", "failure"]),
});

export const providerOrderSchema = z.object({ providerOrderId: z.string().min(1).max(100) });

function requireProvider() {
  const provider = getPaymentProvider();
  // Payments switched off on purpose (PAYMENT_PROVIDER=disabled) — a client-visible condition, not a server fault.
  if (!provider) throw AppError.badRequest("Online payment is not available right now.");
  return provider;
}

/** The member's own order (404 otherwise — another member's order looks missing). */
async function ownOrder(userId: string, orderId: string) {
  const order = await prisma.equipmentPurchaseOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId) throw AppError.notFound("Order not found");
  return order;
}

/** A payment attempt belonging to one of the member's orders. */
async function ownAttempt(userId: string, providerOrderId: string) {
  const attempt = await prisma.equipmentPayment.findUnique({ where: { providerOrderId }, include: { order: true } });
  if (!attempt || attempt.order.userId !== userId) throw AppError.notFound("Payment not found");
  return attempt;
}

/** Step 1 — create a gateway order for an unpaid order the member owns. */
export async function startPayment(userId: string, orderId: string) {
  const provider = requireProvider();
  const order = await ownOrder(userId, orderId);
  if (order.paymentStatus === "PAID") throw AppError.conflict("This order is already paid.");
  if (order.status !== "PENDING_PAYMENT") throw AppError.conflict("This order can no longer be paid.");

  const created = await provider.createOrder({ amount: order.total, receipt: order.orderNumber });
  // Earlier unfinished attempts for this order are superseded.
  await prisma.equipmentPayment.updateMany({ where: { orderId, status: "CREATED" }, data: { status: "CANCELLED", failureReason: "Superseded by a new attempt" } });
  await prisma.equipmentPayment.create({
    data: {
      orderId,
      provider: provider.name,
      isTest: provider.isTest,
      providerOrderId: created.providerOrderId,
      amount: order.total,
      currency: created.currency,
    },
  });
  return {
    provider: provider.name,
    isTest: provider.isTest,
    providerOrderId: created.providerOrderId,
    amount: order.total,
    currency: created.currency,
    orderNumber: order.orderNumber,
    checkout: created.checkout,
  };
}

/**
 * TEST gateway only — stands in for the gateway's own checkout. Success issues
 * a payment id and signature that the member then submits for verification;
 * failure is recorded by the "gateway" and reported back.
 */
export async function simulateGateway(userId: string, input: z.infer<typeof simulateSchema>) {
  const provider = requireProvider();
  if (!isSimulatedGateway(provider)) throw AppError.notFound("Not found");
  const attempt = await ownAttempt(userId, input.providerOrderId);
  if (attempt.status !== "CREATED" || attempt.providerPaymentId) throw AppError.conflict("This payment attempt is already finished.");

  if (input.outcome === "success") {
    const { providerPaymentId, signature } = provider.authorize(attempt.providerOrderId);
    // The gateway records which payment it authorised for this order.
    await prisma.equipmentPayment.update({ where: { id: attempt.id }, data: { providerPaymentId } });
    return { razorpay_order_id: attempt.providerOrderId, razorpay_payment_id: providerPaymentId, razorpay_signature: signature };
  }

  await prisma.$transaction([
    prisma.equipmentPayment.update({ where: { id: attempt.id }, data: { status: "FAILED", failureReason: "Payment declined (test)" } }),
    prisma.equipmentPurchaseOrder.updateMany({ where: { id: attempt.orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "FAILED" } }),
  ]);
  await createAuditLog({
    userId,
    action: "UPDATE",
    module: "equipment",
    entityId: attempt.orderId,
    entityType: "EquipmentPurchaseOrder",
    details: { event: "EQUIPMENT_PAYMENT_FAILED", provider: attempt.provider, providerOrderId: attempt.providerOrderId },
  });
  return { error: { code: "PAYMENT_FAILED", description: "Payment declined (test)", order_id: attempt.providerOrderId } };
}

/** The member closed the checkout. */
export async function cancelPayment(userId: string, providerOrderId: string) {
  const attempt = await ownAttempt(userId, providerOrderId);
  if (attempt.status !== "CREATED") return { status: attempt.status };
  await prisma.$transaction([
    prisma.equipmentPayment.update({ where: { id: attempt.id }, data: { status: "CANCELLED", failureReason: "Checkout closed by the member" } }),
    prisma.equipmentPurchaseOrder.updateMany({ where: { id: attempt.orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "CANCELLED" } }),
  ]);
  return { status: "CANCELLED" };
}

/**
 * Step 2 — server-side verification. The order becomes paid only when the
 * signature is valid for a payment id the gateway issued for this very
 * attempt, the attempt belongs to the member and the amount matches the
 * order total. A browser "success" alone never marks anything paid.
 */
export async function verifyPayment(userId: string, input: z.infer<typeof verifyPaymentSchema>) {
  const provider = requireProvider();
  const attempt = await ownAttempt(userId, input.razorpay_order_id);
  if (attempt.status === "PAID") return { orderId: attempt.orderId, orderNumber: attempt.order.orderNumber, alreadyPaid: true };
  if (attempt.status !== "CREATED") throw AppError.conflict("This payment attempt is no longer valid. Start the payment again.");

  const genuine =
    attempt.provider === provider.name &&
    attempt.providerPaymentId === input.razorpay_payment_id &&
    attempt.amount === attempt.order.total &&
    provider.verifySignature({ providerOrderId: attempt.providerOrderId, providerPaymentId: input.razorpay_payment_id, signature: input.razorpay_signature });
  if (!genuine) {
    await createAuditLog({
      userId,
      action: "UPDATE",
      module: "equipment",
      entityId: attempt.orderId,
      entityType: "EquipmentPurchaseOrder",
      details: { event: "EQUIPMENT_PAYMENT_VERIFICATION_REJECTED", providerOrderId: attempt.providerOrderId },
    });
    throw AppError.badRequest("Payment could not be verified.");
  }

  await prisma.equipmentPayment.update({ where: { id: attempt.id }, data: { status: "PAID", verifiedAt: new Date() } });
  await verifyAndMarkPaid(attempt.orderId, input.razorpay_payment_id, true, userId);
  return { orderId: attempt.orderId, orderNumber: attempt.order.orderNumber, alreadyPaid: false };
}
