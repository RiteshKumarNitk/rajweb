import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderStatusStyle,
  paymentStatusStyle,
} from "@/modules/equipment/order-status";

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", orderStatusStyle(status), className)}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PaymentStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", paymentStatusStyle(status), className)}>
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TestPaymentBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900", className)}>
      Test payment
    </span>
  );
}
