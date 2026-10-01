"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { TestCheckoutModal } from "@/shared/components/equipment/test-checkout-modal";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

/** Pay now / Cancel for an order still awaiting payment. */
export function PendingOrderActions({ orderId, paymentsEnabled, size = "sm" }: { orderId: string; paymentsEnabled: boolean; size?: "sm" | "default" }) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cancelOrder() {
    setBusy(true);
    try {
      const { message } = await handleApiFetch(await apiFetch(`/api/equipment/orders/${orderId}/cancel`, { method: "POST" }));
      toast.success(message ?? "Order cancelled");
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel the order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {paymentsEnabled && (
        <Button size={size} onClick={() => setPaying(true)}>
          Pay now
        </Button>
      )}
      <Button variant="outline" size={size} className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}>
        Cancel order
      </Button>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">Cancel this order?</p>
              <p className="text-sm text-slate-600">The reserved stock is released. Nothing has been charged.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>Keep order</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={cancelOrder} disabled={busy}>
                  {busy ? "Cancelling…" : "Cancel order"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {paying && <TestCheckoutModal orderId={orderId} onClose={() => setPaying(false)} />}
    </div>
  );
}
