import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, CircleDot, CreditCard, MapPin, Package, User } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { requireAuth } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { OrderStatusBadge, PaymentStatusBadge, TestPaymentBadge } from "@/shared/components/equipment/order-badges";
import { formatInrHelper } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { orderTimeline, storeLabel } from "@/modules/equipment/order-status";
import { getPaymentProvider } from "@/modules/payments/payment-provider";
import { PendingOrderActions } from "../orders-actions";

export const dynamic = "force-dynamic";

function when(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { paid } = await searchParams;

  // Only the member's own order — anyone else's id is "not found".
  const order = await prisma.equipmentPurchaseOrder.findFirst({
    where: { id, userId: user.id },
    include: {
      state: { select: { name: true } },
      district: { select: { name: true } },
      items: { include: { equipment: { select: { image: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const paidAttempt = order.payments.find((p) => p.status === "PAID");
  const latestAttempt = order.payments[0];
  const isTest = order.payments.some((p) => p.isTest);
  const timeline = orderTimeline(order);

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      {paid && order.paymentStatus === "PAID" && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Thank you — your order is placed.</p>
            <p className="text-sm">Payment received{isTest ? " (test payment, no real money was charged)" : ""}. {storeLabel(order)} will confirm and ship it.</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Order</p>
            <h1 className="font-mono text-xl font-bold text-primary">{order.orderNumber}</h1>
            <p className="text-sm text-slate-500">Placed {formatDate(order.createdAt)} · Sold by {storeLabel(order)}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Payment</span>
              <PaymentStatusBadge status={order.paymentStatus} />
              {isTest && <TestPaymentBadge />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Order</span>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
        </CardContent>
        {order.status === "PENDING_PAYMENT" && (
          <CardContent className="border-t border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                {order.paymentStatus === "FAILED"
                  ? "The last payment attempt failed. You can try again."
                  : order.paymentStatus === "CANCELLED"
                    ? "The payment was cancelled. You can pay now or cancel the order."
                    : "This order is reserved for you and awaiting payment."}
              </p>
              <PendingOrderActions orderId={order.id} paymentsEnabled={getPaymentProvider() !== null} size="default" />
            </div>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
                      {item.equipment.image ? (
                        <Image src={item.equipment.image} alt={item.productNameSnapshot} fill unoptimized sizes="56px" className="object-cover" />
                      ) : (
                        <Package className="m-auto mt-4 h-6 w-6 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{item.productNameSnapshot}</p>
                      <p className="text-xs text-slate-500">
                        {item.skuSnapshot ? `SKU ${item.skuSnapshot} · ` : ""}
                        {item.quantity} × {formatInrHelper(item.unitPriceSnapshot)}
                      </p>
                    </div>
                    <p className="font-semibold">{formatInrHelper(item.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <div className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatInrHelper(order.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Delivery</span><span className="text-emerald-700">Free</span></div>
                <div className="flex justify-between text-base font-bold"><span>Grand total</span><span>{formatInrHelper(order.total)}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card id="timeline">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l border-slate-200 pl-6">
                {timeline.map((step) => (
                  <li key={step.label} className="relative">
                    <span className="absolute -left-[31px] top-0.5 rounded-full bg-white">
                      {step.label === "Cancelled" ? <CircleDot className="h-4 w-4 text-slate-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                    <p className="text-xs text-slate-500">{when(step.at)}</p>
                    {step.detail && <p className="text-xs text-slate-600">{step.detail}</p>}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" /> Buyer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-slate-900">{order.buyerName ?? "—"}</p>
              <p className="text-slate-600">{order.buyerEmail ?? "—"}</p>
              <p className="text-slate-600">{order.buyerPhone ?? "—"}</p>
              {order.buyerMemberId && <p className="text-xs text-slate-500">Member ID {order.buyerMemberId}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" /> Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-slate-700">
              <p>{order.deliveryAddress ?? "—"}</p>
              <p>{[order.deliveryCity, order.deliveryPincode].filter(Boolean).join(" ") || "—"}</p>
              <p className="pt-1 text-xs text-slate-500">
                District: {order.deliveryDistrictName ?? "—"} · State: {order.deliveryStateName ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" /> Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Method</span><span>{latestAttempt ? (latestAttempt.isTest ? "Dummy Razorpay (test)" : latestAttempt.provider) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><PaymentStatusBadge status={order.paymentStatus} /></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Reference</span><span className="truncate font-mono text-xs">{paidAttempt?.providerPaymentId ?? "—"}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Gateway order</span><span className="truncate font-mono text-xs">{(paidAttempt ?? latestAttempt)?.providerOrderId ?? "—"}</span></div>
              {order.paidAt && <div className="flex justify-between"><span className="text-slate-500">Paid on</span><span>{when(order.paidAt)}</span></div>}
              {latestAttempt?.failureReason && order.paymentStatus !== "PAID" && <p className="text-xs text-red-600">{latestAttempt.failureReason}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
