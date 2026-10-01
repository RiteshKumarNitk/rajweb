import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS, hasPermission } from "@/security/rbac/permissions";
import { isInScope } from "@/security/rbac/org-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { OrderStatusBadge, PaymentStatusBadge, TestPaymentBadge } from "@/shared/components/equipment/order-badges";
import { formatInrHelper } from "@/lib/format";
import { orderTimeline, storeLabel } from "@/modules/equipment/order-status";
import { allowedNextStatuses } from "@/modules/equipment/purchase.service";
import { AdminOrderStatusControl } from "../order-status-control";

export const dynamic = "force-dynamic";

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, scope } = await requireAdminScope(PERMISSIONS.EQUIPMENT_READ);
  const { id } = await params;

  const order = await prisma.equipmentPurchaseOrder.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      state: { select: { name: true } },
      district: { select: { name: true } },
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  // Another district's/state's order is indistinguishable from a missing one.
  if (!order || !isInScope(scope, { stateId: order.stateId, districtId: order.districtId })) notFound();

  const canManage = hasPermission(user, PERMISSIONS.EQUIPMENT_MANAGE);
  const isTest = order.payments.some((p) => p.isTest);

  return (
    <div className="space-y-6">
      <Link href="/admin/equipment/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Order</p>
            <h1 className="font-mono text-xl font-bold text-primary">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">{when(order.createdAt)} · Store: {storeLabel(order)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            {isTest && <TestPaymentBadge />}
          </div>
        </CardContent>
        {canManage && (
          <CardContent className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {order.paymentStatus !== "PAID" && order.status !== "CANCELLED"
                ? "Unpaid — this order cannot be fulfilled until the payment is verified."
                : isTest && order.paymentStatus === "PAID"
                  ? "Paid through the TEST gateway — no real money was received. Do not dispatch real goods."
                  : "Next step:"}
            </p>
            <AdminOrderStatusControl orderId={order.id} nextStatuses={allowedNextStatuses(order.status)} />
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-y border-slate-100 bg-slate-50/70 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-2">Item</th>
                    <th className="px-5 py-2">SKU</th>
                    <th className="px-5 py-2 text-right">Qty</th>
                    <th className="px-5 py-2 text-right">Unit price</th>
                    <th className="px-5 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-5 py-2.5 font-medium text-slate-800">{i.productNameSnapshot}</td>
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-500">{i.skuSnapshot ?? "—"}</td>
                      <td className="px-5 py-2.5 text-right">{i.quantity}</td>
                      <td className="px-5 py-2.5 text-right">{formatInrHelper(i.unitPriceSnapshot)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{formatInrHelper(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatInrHelper(order.subtotal)}</span></div>
                <div className="flex justify-between text-base font-bold"><span>Grand total</span><span>{formatInrHelper(order.total)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Payment attempts</CardTitle></CardHeader>
            <CardContent className="p-0">
              {order.payments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">No payment attempts yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 text-sm">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                      <span className="font-mono text-xs">{p.providerOrderId}</span>
                      <span className="text-xs text-slate-500">{p.isTest ? "Dummy Razorpay (test)" : p.provider}</span>
                      <span className="text-xs font-semibold">{p.status}</span>
                      <span className="font-mono text-xs text-slate-500">{p.providerPaymentId ?? "—"}</span>
                      <span className="text-xs text-slate-500">{when(p.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Buyer</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{order.buyerName ?? order.user.name}</p>
              <p className="text-slate-600">{order.buyerEmail ?? order.user.email}</p>
              <p className="text-slate-600">{order.buyerPhone ?? "—"}</p>
              {order.buyerMemberId && <p className="text-xs text-slate-500">Member ID {order.buyerMemberId}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-700">
              <p>{order.deliveryAddress ?? "—"}</p>
              <p>{[order.deliveryCity, order.deliveryPincode].filter(Boolean).join(" ") || "—"}</p>
              <p className="text-xs text-slate-500">District: {order.deliveryDistrictName ?? "—"} · State: {order.deliveryStateName ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {orderTimeline(order).map((s) => (
                  <li key={s.label}>
                    <p className="font-medium text-slate-800">{s.label}</p>
                    <p className="text-xs text-slate-500">{when(new Date(s.at))}{s.detail ? ` · ${s.detail}` : ""}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
