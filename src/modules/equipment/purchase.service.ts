import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createAuditLog } from "@/services/audit/audit-service";
import { createModuleLogger } from "@/core/logger";
import { sanitizeText, sanitizePhone, sanitizeEmail } from "@/security/sanitize";
import { getMemberHome } from "@/modules/account/member-home.server";
import { memberEquipmentWhere } from "@/modules/equipment/catalog";

const log = createModuleLogger("equipment-purchase");

/**
 * Order model.
 *  - `paymentStatus` (PENDING / PAID / FAILED / CANCELLED / REFUNDED) records
 *    payment and is set to PAID only by verifyAndMarkPaid(), after the payment
 *    provider's server-side verification.
 *  - `status` is the fulfilment lifecycle: PENDING_PAYMENT → (verified
 *    payment) → PLACED → CONFIRMED → PROCESSING → SHIPPED → DELIVERED, or
 *    CANCELLED while unpaid. Legacy rows may hold PAID (= PLACED) or
 *    COMPLETED (= DELIVERED).
 *  - Stock is reserved when the order is created (atomic conditional
 *    decrement, never negative) and released if an unpaid order is cancelled.
 *  - Names, SKUs and unit prices are snapshotted: later product edits never
 *    change an existing order.
 */

const lineSchema = z.object({
  equipmentId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
});

export const deliverySchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name").max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  address: z.string().trim().min(10, "Enter the full delivery address").max(300),
  city: z.string().trim().min(2, "Enter the city").max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

/** Legacy endpoint body (/api/equipment/purchase): delivery details optional. */
export const purchaseSchema = z.object({
  items: z.array(lineSchema).min(1).max(10),
  delivery: deliverySchema.optional(),
});

/** Member checkout body (/api/account/equipment/orders): delivery details required. */
export const checkoutSchema = z.object({
  items: z.array(lineSchema).min(1).max(10),
  delivery: deliverySchema,
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RRA-ORD-${timestamp}-${random}`;
}

/**
 * Creates an order inside one transaction:
 *  - every item must be in the buyer's catalog (their district, their state's
 *    store or the central store) — anything else is "not found", whatever
 *    id the client sends,
 *  - each item's stock is reserved with a conditional atomic decrement,
 *  - name, SKU and unit price are snapshotted; totals come from the snapshots,
 *  - the order belongs to the store (state/district) that fulfils it — one
 *    order per store,
 *  - buyer and delivery details are snapshotted from the session user, the
 *    member's home State/District and the submitted delivery form.
 */
export async function createPurchaseOrder(userId: string, input: PurchaseInput) {
  const merged = new Map<string, number>();
  for (const line of input.items) {
    merged.set(line.equipmentId, (merged.get(line.equipmentId) ?? 0) + line.quantity);
  }

  const [home, buyer] = await Promise.all([
    getMemberHome(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, phone: true, profile: { select: { address: true, city: true, pincode: true } } } }),
  ]);
  const visible = memberEquipmentWhere(home);
  const delivery = input.delivery;

  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    let owner: { stateId: string | null; districtId: string | null } | undefined;
    const itemRows: { equipmentId: string; productNameSnapshot: string; skuSnapshot: string | null; unitPriceSnapshot: number; quantity: number; lineTotal: number }[] = [];

    for (const [equipmentId, quantity] of merged) {
      // Visibility first: another district's item is indistinguishable from a missing one.
      const product = await tx.equipmentItem.findFirst({ where: { id: equipmentId, ...visible } });
      if (!product) throw AppError.notFound("Equipment not found");

      const productOwner = { stateId: product.stateId, districtId: product.districtId };
      if (!owner) {
        owner = productOwner;
      } else if (owner.stateId !== productOwner.stateId || owner.districtId !== productOwner.districtId) {
        throw AppError.validation("Items from different stores must be ordered separately. Please place one order per store.");
      }

      // Conditional atomic reservation: only succeeds while stock is sufficient.
      const reserved = await tx.equipmentItem.updateMany({
        where: { id: equipmentId, isActive: true, stockQuantity: { gte: quantity } },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (reserved.count === 0) {
        throw AppError.conflict("An item in your order is no longer available in the requested quantity.");
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      itemRows.push({
        equipmentId,
        productNameSnapshot: product.name,
        skuSnapshot: product.sku,
        unitPriceSnapshot: product.price,
        quantity,
        lineTotal,
      });
    }

    return tx.equipmentPurchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        subtotal,
        total: subtotal,
        stateId: owner?.stateId ?? null,
        districtId: owner?.districtId ?? null,
        buyerName: sanitizeText(delivery?.name ?? buyer?.name ?? "Member"),
        buyerEmail: delivery?.email ? sanitizeEmail(delivery.email) : buyer?.email ?? null,
        buyerPhone: delivery?.phone ? sanitizePhone(delivery.phone) : buyer?.phone ?? null,
        buyerMemberId: home.memberId,
        deliveryAddress: delivery ? sanitizeText(delivery.address) : buyer?.profile?.address ?? null,
        deliveryCity: delivery ? sanitizeText(delivery.city) : buyer?.profile?.city ?? null,
        deliveryPincode: delivery?.pincode ?? buyer?.profile?.pincode ?? null,
        deliveryStateName: home.stateName,
        deliveryDistrictName: home.districtName,
        items: { create: itemRows },
      },
      include: { items: true },
    });
  });

  await createAuditLog({
    userId,
    action: "CREATE",
    module: "equipment",
    entityId: order.id,
    entityType: "EquipmentPurchaseOrder",
    details: {
      event: "EQUIPMENT_ORDER_CREATED",
      orderNumber: order.orderNumber,
      total: order.total,
      stateId: order.stateId,
      districtId: order.districtId,
      items: order.items.map((i) => ({ name: i.productNameSnapshot, qty: i.quantity, amount: i.lineTotal })),
    },
  });

  log.info({ orderId: order.id, userId, total: order.total }, "Equipment order created");
  return order;
}

/**
 * The single place an order becomes paid: called only after the payment
 * provider's server-side verification succeeded. Moves the order to
 * Payment PAID / Order PLACED. Idempotent.
 */
export async function verifyAndMarkPaid(orderId: string, paymentReference: string | null, isVerified: boolean, actorId?: string) {
  const order = await prisma.equipmentPurchaseOrder.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus === "PAID") return { order, verified: true };
  if (!isVerified) throw AppError.badRequest("Payment could not be verified.");
  if (order.status !== "PENDING_PAYMENT") throw AppError.conflict("This order can no longer be paid.");

  const updated = await prisma.equipmentPurchaseOrder.update({
    where: { id: orderId, paymentStatus: { not: "PAID" }, status: "PENDING_PAYMENT" },
    data: { status: "PLACED", paymentStatus: "PAID", paidAt: new Date() },
  });

  await createAuditLog({
    userId: actorId,
    action: "UPDATE",
    module: "equipment",
    entityId: orderId,
    entityType: "EquipmentPurchaseOrder",
    details: { event: "EQUIPMENT_PAYMENT_VERIFIED", orderNumber: order.orderNumber, paymentReference, stateId: order.stateId, districtId: order.districtId },
  });
  return { order: updated, verified: true };
}

/** Cancels an UNPAID order and releases its stock reservation in one transaction. */
export async function cancelPendingOrder(orderId: string, actorId: string, isAdmin = false) {
  const order = await prisma.equipmentPurchaseOrder.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) throw AppError.notFound("Order not found");
  if (!isAdmin && order.userId !== actorId) throw AppError.notFound("Order not found");
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") {
    throw AppError.conflict("Only unpaid orders can be cancelled.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const guard = await tx.equipmentPurchaseOrder.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT", paymentStatus: { not: "PAID" } },
      data: { status: "CANCELLED", paymentStatus: "CANCELLED", cancelledAt: new Date() },
    });
    if (guard.count === 0) throw AppError.conflict("Only unpaid orders can be cancelled.");
    for (const item of order.items) {
      await tx.equipmentItem.update({ where: { id: item.equipmentId }, data: { stockQuantity: { increment: item.quantity } } });
    }
    await tx.equipmentPayment.updateMany({ where: { orderId, status: "CREATED" }, data: { status: "CANCELLED" } });
    return tx.equipmentPurchaseOrder.findUniqueOrThrow({ where: { id: orderId } });
  });

  await createAuditLog({
    userId: actorId,
    action: "UPDATE",
    module: "equipment",
    entityId: orderId,
    entityType: "EquipmentPurchaseOrder",
    details: {
      event: isAdmin ? "EQUIPMENT_ORDER_CANCELLED_ADMIN" : "EQUIPMENT_ORDER_CANCELLED",
      orderNumber: order.orderNumber,
      stateId: order.stateId,
      districtId: order.districtId,
    },
  });
  return updated;
}

/** Fulfilment steps an admin may set, in order. */
export const FULFILMENT_STEPS = ["PLACED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

/** Allowed admin moves from each status (legacy PAID = PLACED, COMPLETED = DELIVERED). */
const NEXT_STATUS: Record<string, string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PLACED: ["CONFIRMED"],
  PAID: ["CONFIRMED"],
  CONFIRMED: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export function allowedNextStatuses(status: string): string[] {
  return NEXT_STATUS[status] ?? [];
}

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  courierName: z.string().trim().max(100).optional().or(z.literal("")),
  trackingNumber: z.string().trim().max(100).optional().or(z.literal("")),
});

const STEP_TIMESTAMP: Record<string, "confirmedAt" | "processingAt" | "shippedAt" | "deliveredAt"> = {
  CONFIRMED: "confirmedAt",
  PROCESSING: "processingAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
};

/**
 * Admin fulfilment update. Moves one step forward at a time; every step needs
 * a verified payment. Unpaid orders can only be cancelled (stock released);
 * paid orders cannot be cancelled until refunds exist; cancelled is final.
 * Never touches paymentStatus.
 */
export async function adminUpdateOrderStatus(orderId: string, input: z.infer<typeof adminOrderUpdateSchema>, adminId: string) {
  const existing = await prisma.equipmentPurchaseOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw AppError.notFound("Order not found");
  const { status } = input;
  if (existing.status === status) return existing;

  if (existing.status === "CANCELLED") throw AppError.conflict("Cancelled orders cannot be reopened.");
  if (status === "CANCELLED") {
    if (existing.status === "PENDING_PAYMENT" && existing.paymentStatus !== "PAID") return cancelPendingOrder(orderId, adminId, true);
    throw AppError.conflict("Paid orders cannot be cancelled — refunds are not supported yet.");
  }
  if (existing.paymentStatus !== "PAID") {
    throw AppError.badRequest("This order has not been paid — it cannot be fulfilled.");
  }
  if (!allowedNextStatuses(existing.status).includes(status)) {
    throw AppError.conflict(`An order cannot move from ${existing.status.replace("_", " ").toLowerCase()} to ${status.toLowerCase()}.`);
  }

  const updated = await prisma.equipmentPurchaseOrder.update({
    where: { id: orderId, status: existing.status },
    data: {
      status,
      [STEP_TIMESTAMP[status]]: new Date(),
      ...(status === "SHIPPED"
        ? { courierName: input.courierName ? sanitizeText(input.courierName) : null, trackingNumber: input.trackingNumber ? sanitizeText(input.trackingNumber) : null }
        : {}),
    },
  });

  await createAuditLog({
    userId: adminId,
    action: "UPDATE",
    module: "equipment",
    entityId: orderId,
    entityType: "EquipmentPurchaseOrder",
    details: {
      event: "EQUIPMENT_ORDER_STATUS_CHANGED",
      orderNumber: existing.orderNumber,
      stateId: existing.stateId,
      districtId: existing.districtId,
      previousValue: existing.status,
      newValue: status,
    },
  });
  return updated;
}
