import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { createAuditLog } from "@/services/audit/audit-service";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("equipment-purchase");

/**
 * Payment model: orders are created PENDING_PAYMENT with stock *reserved*
 * (atomic conditional decrement — can never go negative). Payment is verified
 * server-side before an order becomes PAID; the browser never confirms
 * payment. Pending orders that are never paid release their reservation when
 * cancelled (explicitly by the user/admin, or via the cancel endpoint) —
 * there is no permanent stock lock.
 */

export const purchaseSchema = z.object({
  items: z
    .array(
      z.object({
        equipmentId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1)
    .max(10),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RRA-ORD-${timestamp}-${random}`;
}

/**
 * Creates an order inside one transaction:
 *  - every item is re-read server-side (client never supplies price/name),
 *  - each item's stock is reserved with a conditional atomic decrement
 *    (stock >= quantity or the whole purchase fails — never negative),
 *  - name and unit price are snapshotted onto the order items,
 *  - totals are computed from those snapshots.
 */
export async function createPurchaseOrder(userId: string, input: PurchaseInput) {
  // Merge duplicate lines for the same product.
  const merged = new Map<string, number>();
  for (const line of input.items) {
    merged.set(line.equipmentId, (merged.get(line.equipmentId) ?? 0) + line.quantity);
  }

  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const itemRows: {
      equipmentId: string;
      productNameSnapshot: string;
      unitPriceSnapshot: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const [equipmentId, quantity] of merged) {
      // Conditional atomic reservation: only succeeds while stock is sufficient.
      // updateMany returns the count — 0 means insufficient stock (or gone).
      const reserved = await tx.equipmentItem.updateMany({
        where: { id: equipmentId, isActive: true, stockQuantity: { gte: quantity } },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (reserved.count === 0) {
        throw AppError.conflict(
          "An item in your order is no longer available in the requested quantity."
        );
      }

      const product = await tx.equipmentItem.findUnique({ where: { id: equipmentId } });
      if (!product) {
        // Should be unreachable (reservation just succeeded) — roll back.
        throw AppError.notFound("Equipment item not found");
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;
      itemRows.push({
        equipmentId,
        productNameSnapshot: product.name,
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
      items: itemAuditSummary(order.items),
    },
  });

  log.info({ orderId: order.id, userId, total: order.total }, "Equipment order created");
  return order;
}

function itemAuditSummary(items: { productNameSnapshot: string; quantity: number; lineTotal: number }[]) {
  return items.map((i) => ({ name: i.productNameSnapshot, qty: i.quantity, amount: i.lineTotal }));
}

/**
 * Server-side payment verification chokepoint for Phase-J-style gateway
 * integration. A browser claim of success can NEVER mark an order paid: this
 * is the single place that transitions PENDING_PAYMENT → PAID, and it only
 * proceeds when `isVerified` is true (i.e. the provider's server-side
 * signature/webhook check has passed). No provider is configured yet, so
 * callers currently cannot pass verification — the order stays PENDING_PAYMENT
 * and the visitor is told to contact RRA.
 */
export async function verifyAndMarkPaid(
  orderId: string,
  paymentReference: string | null,
  isVerified: boolean,
  adminId?: string
) {
  const order = await prisma.equipmentPurchaseOrder.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  // Idempotency: already-paid orders stay paid, no double transition.
  if (order.paymentStatus === "PAID") {
    return { order, verified: true };
  }

  if (!isVerified) {
    throw AppError.badRequest(
      "Online payment is not available yet. Your order is saved as pending payment — contact RRA to complete it."
    );
  }

  // Conditional update = idempotent guard against racing callbacks.
  const updated = await prisma.equipmentPurchaseOrder.update({
    where: { id: orderId, paymentStatus: { not: "PAID" } },
    data: { status: "PAID", paymentStatus: "PAID" },
  });

  await createAuditLog({
    userId: adminId,
    action: "UPDATE",
    module: "equipment",
    entityId: orderId,
    entityType: "EquipmentPurchaseOrder",
    details: {
      event: "EQUIPMENT_PAYMENT_VERIFIED",
      orderNumber: order.orderNumber,
      paymentReference,
    },
  });

  return { order: updated, verified: true };
}

/**
 * Cancels a pending order and releases its stock reservation in one
 * transaction. Paid/completed orders cannot be cancelled this way.
 */
export async function cancelPendingOrder(orderId: string, actorId: string, isAdmin = false) {
  const order = await prisma.equipmentPurchaseOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw AppError.notFound("Order not found");
  if (!isAdmin && order.userId !== actorId) {
    // Ownership mismatch must not reveal the order's existence.
    throw AppError.notFound("Order not found");
  }
  if (order.status !== "PENDING_PAYMENT") {
    throw AppError.conflict("Only unpaid orders can be cancelled.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Restock every reserved line.
    for (const item of order.items) {
      await tx.equipmentItem.update({
        where: { id: item.equipmentId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
    return tx.equipmentPurchaseOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED", paymentStatus: "FAILED" },
    });
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
    },
  });

  return updated;
}

const ADMIN_ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "COMPLETED", "CANCELLED"] as const;

export const adminOrderUpdateSchema = z.object({
  status: z.enum(ADMIN_ORDER_STATUSES),
});

/**
 * Admin fulfilment-status update. Deliberately does NOT touch paymentStatus —
 * an admin cannot mark an unpaid order as paid here; payment verification
 * stays with the provider flow (verifyAndMarkPaid).
 */
export async function adminUpdateOrderStatus(orderId: string, status: (typeof ADMIN_ORDER_STATUSES)[number], adminId: string) {
  const existing = await prisma.equipmentPurchaseOrder.findUnique({ where: { id: orderId } });
  if (!existing) throw AppError.notFound("Order not found");
  if (existing.status === status) return existing;

  // Cancelling a pending order releases stock; fulfilling requires payment first.
  if (status === "CANCELLED" && existing.status === "PENDING_PAYMENT") {
    return cancelPendingOrder(orderId, adminId, true);
  }
  if (status === "PAID" && existing.paymentStatus !== "PAID") {
    throw AppError.badRequest("Order payment must be verified server-side before it can be marked paid.");
  }

  const updated = await prisma.equipmentPurchaseOrder.update({
    where: { id: orderId },
    data: { status },
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
      previousValue: existing.status,
      newValue: status,
    },
  });

  return updated;
}
