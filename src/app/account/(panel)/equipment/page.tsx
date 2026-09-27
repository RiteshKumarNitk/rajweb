import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { requireAuth } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";

export const dynamic = "force-dynamic";

/** The store (inventory) that sold/fulfils an order — from the order's own snapshot. */
function storeName(order: { state: { name: string } | null; district: { name: string } | null }): string {
  if (order.district) return order.state ? `${order.district.name}, ${order.state.name}` : order.district.name;
  return order.state ? `${order.state.name} (state store)` : "RRA Central Store";
}

export default async function AccountEquipmentPage() {
  const user = await requireAuth();

  // Purchased items across the user's paid orders — session-scoped query.
  const orders = await prisma.equipmentPurchaseOrder.findMany({
    where: { userId: user.id, status: { in: ["PAID", "COMPLETED"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      paymentStatus: true,
      status: true,
      state: { select: { name: true } },
      district: { select: { name: true } },
      items: {
        select: {
          id: true,
          productNameSnapshot: true,
          quantity: true,
          unitPriceSnapshot: true,
          equipment: { select: { slug: true } },
        },
      },
    },
  });

  const rows = orders.flatMap((order) =>
    order.items.map((item) => ({
      key: item.id,
      name: item.productNameSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPriceSnapshot,
      purchasedAt: order.createdAt,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      slug: item.equipment.slug,
      store: storeName(order),
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Equipment</h1>
        <p className="text-sm text-slate-500">Equipment you have purchased through RRA.</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-500">No purchased equipment yet.</p>
          <Link
            href="/equipment"
            className="mt-3 inline-block text-sm font-semibold text-secondary hover:underline"
          >
            Visit the Equipment Shop →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.key} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/5">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <StatusBadge
                  status={row.paymentStatus === "PAID" ? "ACTIVE" : "PENDING"}
                  label={row.paymentStatus === "PAID" ? "Paid" : "Payment pending"}
                />
              </div>
              <p className="mt-3 font-bold text-primary">{row.name}</p>
              <p className="text-xs text-slate-500">Purchased {formatDate(row.purchasedAt)}</p>
              <dl className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <dt>Quantity</dt>
                  <dd className="font-semibold">{row.quantity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Unit price</dt>
                  <dd>{formatInrHelper(row.unitPrice)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Order</dt>
                  <dd className="font-mono">{row.orderNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Store</dt>
                  <dd>{row.store}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
