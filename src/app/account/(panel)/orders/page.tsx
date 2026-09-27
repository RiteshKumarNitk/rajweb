import Link from "next/link";
import { requireAuth } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";
import { OrdersActions } from "./orders-actions";

export const dynamic = "force-dynamic";

const ORDER_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

/** The store (inventory) that sold/fulfils an order — from the order's own snapshot. */
function storeName(order: { state: { name: string } | null; district: { name: string } | null }): string {
  if (order.district) return order.state ? `${order.district.name}, ${order.state.name}` : order.district.name;
  return order.state ? `${order.state.name} (state store)` : "RRA Central Store";
}

export default async function AccountOrdersPage() {
  const user = await requireAuth();

  // Only the signed-in user's orders — filtered by the session user id.
  const orders = await prisma.equipmentPurchaseOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { equipment: { select: { slug: true } } } },
      state: { select: { name: true } },
      district: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Orders</h1>
        <p className="text-sm text-slate-500">Your equipment orders and their current status.</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-500">You have no equipment orders yet.</p>
          <Link
            href="/equipment"
            className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline"
          >
            Browse the Equipment Shop →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                <div>
                  <p className="font-bold text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">
                    Placed {formatDate(order.createdAt)} · {storeName(order)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={order.status === "PAID" ? "ACTIVE" : order.status === "CANCELLED" ? "REJECTED" : "PENDING"}
                    label={ORDER_LABELS[order.status] ?? order.status}
                  />
                  <StatusBadge
                    status={order.paymentStatus === "PAID" ? "ACTIVE" : order.paymentStatus === "FAILED" ? "REJECTED" : "PENDING"}
                    label={`Payment: ${PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}`}
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{item.productNameSnapshot}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatInrHelper(item.unitPriceSnapshot)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-800">{formatInrHelper(item.lineTotal)}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                <span className="text-sm text-slate-600">
                  Total <strong className="text-base text-primary">{formatInrHelper(order.total)}</strong>
                </span>
                {order.status === "PENDING_PAYMENT" && (
                  <OrdersActions orderId={order.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
