"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

const ACTION_LABELS: Record<string, string> = {
  CONFIRMED: "Confirm order",
  PROCESSING: "Start processing",
  SHIPPED: "Mark shipped",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel unpaid order",
};

/**
 * Next fulfilment step(s) for an order — computed server-side from the
 * allowed transitions (the API enforces them again).
 */
export function AdminOrderStatusControl({ orderId, nextStatuses }: { orderId: string; nextStatuses: string[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);

  if (nextStatuses.length === 0) return <span className="text-xs text-slate-400">No further steps</span>;

  async function apply() {
    if (!target) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: target, ...(target === "SHIPPED" ? { courierName, trackingNumber } : {}) }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Order updated");
      setTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((s) => (
        <Button
          key={s}
          size="sm"
          variant={s === "CANCELLED" ? "outline" : "default"}
          className={s === "CANCELLED" ? "border-red-200 text-red-600 hover:bg-red-50" : undefined}
          onClick={() => setTarget(s)}
        >
          {ACTION_LABELS[s] ?? s}
        </Button>
      ))}

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">{ACTION_LABELS[target] ?? target}?</p>
              {target === "CANCELLED" ? (
                <p className="text-sm text-slate-600">The order is unpaid. Cancelling releases its reserved stock.</p>
              ) : (
                <p className="text-sm text-slate-600">The member sees this step on their order timeline.</p>
              )}
              {target === "SHIPPED" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ship-courier">Courier (optional)</Label>
                    <Input id="ship-courier" value={courierName} maxLength={100} onChange={(e) => setCourierName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ship-tracking">Tracking number (optional)</Label>
                    <Input id="ship-tracking" value={trackingNumber} maxLength={100} onChange={(e) => setTrackingNumber(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>Back</Button>
                <Button onClick={apply} disabled={busy}>{busy ? "Saving…" : "Confirm"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
