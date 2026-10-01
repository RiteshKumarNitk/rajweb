import Link from "next/link";
import { ShoppingBag, Clock, Truck, PackageCheck, XCircle, IndianRupee, Package } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { requireAuth } from "@/security/auth/session";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { OrderStatusBadge, PaymentStatusBadge, TestPaymentBadge } from "@/shared/components/equipment/order-badges";
import { formatInrHelper } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { orderBucket, storeLabel } from "@/modules/equipment/order-status";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import { PendingOrderActions } from "./orders-actions";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await requireAuth();

  // Session-scoped: only the signed-in member's own orders.
  const orders = await prisma.equipmentPurchaseOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      total: true,
      trackingNumber: true,
      deliveryDistrictName: true,
      state: { select: { name: true } },
      district: { select: { name: true } },
      items: { select: { productNameSnapshot: true, quantity: true } },
      payments: { select: { isTest: true, status: true } },
    },
  });

  const counts = { pending: 0, processing: 0, delivered: 0, cancelled: 0 };
  for (const o of orders) counts[orderBucket(o.status)]++;
  const totalSpent = orders.filter((o) => o.paymentStatus === "PAID").reduce((n, o) => n + o.total, 0);
  const paymentsEnabled = getPaymentProvider() !== null;

  const cards = [
    { label: "Total Orders", value: orders.length, icon: ShoppingBag, tone: "text-primary" },
    { label: "Awaiting Payment", value: counts.pending, icon: Clock, tone: "text-amber-600" },
    { label: "In Progress", value: counts.processing, icon: Truck, tone: "text-blue-600" },
    { label: "Delivered", value: counts.delivered, icon: PackageCheck, tone: "text-emerald-600" },
    { label: "Cancelled", value: counts.cancelled, icon: XCircle, tone: "text-slate-500" },
    { label: "Total Spent", value: formatInrHelper(totalSpent), icon: IndianRupee, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Orders</h1>
          <p className="text-sm text-slate-500">Track payments and deliveries for your equipment orders.</p>
        </div>
        <Button asChild>
          <Link href="/account/equipment">Shop equipment</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <c.icon className={`h-5 w-5 ${c.tone}`} />
              <p className="mt-2 text-xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card>
          <EmptyState
            title="No orders yet"
            description="Equipment you order from your district store appears here."
            icon={<Package className="h-8 w-8" />}
            action={
              <Button asChild size="sm">
                <Link href="/account/equipment">Browse equipment</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{o.orderNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {o.items.map((i) => `${i.productNameSnapshot} × ${i.quantity}`).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.district?.name ?? storeLabel(o)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatInrHelper(o.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <PaymentStatusBadge status={o.paymentStatus} />
                          {o.payments.some((p) => p.isTest) && <TestPaymentBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <Link href={`/account/orders/${o.id}`} className="text-xs font-semibold text-accent hover:underline">View details</Link>
                          {o.trackingNumber && (
                            <Link href={`/account/orders/${o.id}#timeline`} className="text-xs font-semibold text-accent hover:underline">Track order</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.map((o) => (
                <li key={o.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-semibold text-slate-800">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">{formatDate(o.createdAt)} · {o.district?.name ?? storeLabel(o)}</p>
                    </div>
                    <p className="font-semibold">{formatInrHelper(o.total)}</p>
                  </div>
                  <p className="text-sm text-slate-700">{o.items.map((i) => `${i.productNameSnapshot} × ${i.quantity}`).join(", ")}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <OrderStatusBadge status={o.status} />
                    <PaymentStatusBadge status={o.paymentStatus} />
                    {o.payments.some((p) => p.isTest) && <TestPaymentBadge />}
                  </div>
                  <Link href={`/account/orders/${o.id}`} className="inline-block text-xs font-semibold text-accent hover:underline">View details</Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {orders.some((o) => o.status === "PENDING_PAYMENT") && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold text-amber-900">Orders awaiting payment</p>
            <ul className="space-y-3">
              {orders
                .filter((o) => o.status === "PENDING_PAYMENT")
                .map((o) => (
                  <li key={o.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-700">
                      <span className="font-mono font-semibold">{o.orderNumber}</span> · {formatInrHelper(o.total)}
                    </span>
                    <PendingOrderActions orderId={o.id} paymentsEnabled={paymentsEnabled} />
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
