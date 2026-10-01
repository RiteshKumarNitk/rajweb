/** Order / payment status presentation shared by member and admin screens (client-safe). */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Placed",
  PAID: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-800 border-amber-200",
  PLACED: "bg-sky-50 text-sky-800 border-sky-200",
  PAID: "bg-sky-50 text-sky-800 border-sky-200",
  CONFIRMED: "bg-indigo-50 text-indigo-800 border-indigo-200",
  PROCESSING: "bg-violet-50 text-violet-800 border-violet-200",
  SHIPPED: "bg-blue-50 text-blue-800 border-blue-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
  REFUNDED: "bg-slate-100 text-slate-700 border-slate-200",
};

export function orderStatusStyle(status: string): string {
  return ORDER_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}
export function paymentStatusStyle(status: string): string {
  return PAYMENT_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

/** Dashboard bucket for an order. */
export function orderBucket(status: string): "pending" | "processing" | "delivered" | "cancelled" {
  if (status === "PENDING_PAYMENT") return "pending";
  if (status === "DELIVERED" || status === "COMPLETED") return "delivered";
  if (status === "CANCELLED") return "cancelled";
  return "processing";
}

export interface TimelineInput {
  status: string;
  createdAt: Date | string;
  paidAt?: Date | string | null;
  confirmedAt?: Date | string | null;
  processingAt?: Date | string | null;
  shippedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  cancelledAt?: Date | string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
}

/** Only the steps that actually happened, in order. */
export function orderTimeline(o: TimelineInput): { label: string; at: Date | string; detail?: string }[] {
  const steps: { label: string; at: Date | string | null | undefined; detail?: string }[] = [
    { label: "Order created", at: o.createdAt },
    { label: "Payment confirmed — order placed", at: o.paidAt },
    { label: "Confirmed by the store", at: o.confirmedAt },
    { label: "Processing", at: o.processingAt },
    {
      label: "Shipped",
      at: o.shippedAt,
      detail: [o.courierName, o.trackingNumber && `Tracking ${o.trackingNumber}`].filter(Boolean).join(" · ") || undefined,
    },
    { label: "Delivered", at: o.deliveredAt },
    { label: "Cancelled", at: o.cancelledAt },
  ];
  return steps.filter((s): s is { label: string; at: Date | string; detail?: string } => !!s.at);
}

export const STORE_LABEL_CENTRAL = "RRA Central Store";

export function storeLabel(store: { state?: { name: string } | null; district?: { name: string } | null }): string {
  if (store.district) return store.state ? `${store.district.name}, ${store.state.name}` : store.district.name;
  if (store.state) return `${store.state.name} (state store)`;
  return STORE_LABEL_CENTRAL;
}
