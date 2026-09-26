"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export function OrdersActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleCancel() {
    if (!window.confirm("Cancel this order? Reserved stock will be released.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/equipment/orders/${orderId}/cancel`, { method: "POST" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Order cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-red-200 text-red-600 hover:bg-red-50"
      onClick={handleCancel}
      disabled={busy}
    >
      {busy ? "Cancelling…" : "Cancel order"}
    </Button>
  );
}
