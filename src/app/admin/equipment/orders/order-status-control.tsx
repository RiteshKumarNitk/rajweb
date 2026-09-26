"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

const OPTIONS = ["PENDING_PAYMENT", "PAID", "COMPLETED", "CANCELLED"] as const;

export function AdminOrderStatusControl({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(next: string) {
    if (next === currentStatus) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Status updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      Fulfilment status
      <select
        value={currentStatus}
        disabled={busy}
        onChange={(e) => handleStatusChange(e.target.value)}
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
