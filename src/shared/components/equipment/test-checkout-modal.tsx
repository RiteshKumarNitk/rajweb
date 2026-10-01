"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck, X, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { apiPost, handleApiFetch } from "@/lib/api-client";
import { formatInrHelper } from "@/lib/format";

type Phase = "starting" | "ready" | "processing" | "failed" | "error";

interface PaymentSession {
  providerOrderId: string;
  amount: number;
  orderNumber: string;
  provider: string;
  isTest: boolean;
}

/**
 * Simulated Razorpay checkout for the TEST gateway. The "gateway" (server)
 * issues a signed payment result; the order is marked paid only by the
 * server-side /verify step — never by this component.
 */
export function TestCheckoutModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [message, setMessage] = useState("");

  // Creates a fresh gateway order (a new attempt each time).
  const createSession = useCallback(async (): Promise<{ data?: PaymentSession; error?: string }> => {
    try {
      const { data } = await handleApiFetch<PaymentSession>(await apiPost("/api/account/equipment/payment/create", { orderId }));
      return { data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not start the payment." };
    }
  }, [orderId]);

  const applySession = useCallback((result: { data?: PaymentSession; error?: string }) => {
    if (result.data) {
      setSession(result.data);
      setPhase("ready");
    } else {
      setMessage(result.error ?? "Could not start the payment.");
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    createSession().then((result) => active && applySession(result));
    return () => {
      active = false;
    };
  }, [createSession, applySession]);

  async function start() {
    setPhase("starting");
    setMessage("");
    applySession(await createSession());
  }

  async function pay() {
    if (!session) return;
    setPhase("processing");
    try {
      const { data: gateway } = await handleApiFetch<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>(
        await apiPost("/api/account/equipment/payment/simulate", { providerOrderId: session.providerOrderId, outcome: "success" })
      );
      const { message: done } = await handleApiFetch(await apiPost("/api/account/equipment/payment/verify", gateway));
      toast.success(done ?? "Payment confirmed");
      router.push(`/account/orders/${orderId}?paid=1`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Payment could not be verified.");
      setPhase("failed");
    }
  }

  async function fail() {
    if (!session) return;
    setPhase("processing");
    try {
      await handleApiFetch(await apiPost("/api/account/equipment/payment/simulate", { providerOrderId: session.providerOrderId, outcome: "failure" }));
    } catch {
      // The failure itself is what we are showing.
    }
    setMessage("The payment was declined (test). Nothing was charged — your order is saved and you can try again.");
    setPhase("failed");
  }

  async function cancel() {
    if (session && phase === "ready") {
      await apiPost("/api/account/equipment/payment/cancel", { providerOrderId: session.providerOrderId }).catch(() => null);
      toast.message("Payment cancelled — your order is saved as awaiting payment.");
      router.push(`/account/orders/${orderId}`);
      router.refresh();
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Test payment">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#0c2451] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold">Razorpay Checkout</p>
              <p className="text-[11px] text-blue-200">Simulated test gateway</p>
            </div>
          </div>
          <button type="button" onClick={cancel} disabled={phase === "processing"} className="rounded p-1 hover:bg-white/10" aria-label="Close payment">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wide">Test payment — no real money will be charged</p>
        </div>

        <div className="space-y-5 p-5">
          {phase === "starting" && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing payment…
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-4 py-2 text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-500" />
              <p className="text-sm text-slate-700">{message}</p>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}

          {session && (phase === "ready" || phase === "processing") && (
            <>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Paying for order</p>
                <p className="font-mono text-sm font-semibold text-slate-900">{session.orderNumber}</p>
                <p className="mt-3 text-xs text-slate-500">Amount</p>
                <p className="text-2xl font-bold text-primary">{formatInrHelper(session.amount)}</p>
                <p className="mt-2 font-mono text-[11px] text-slate-400">{session.providerOrderId}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" onClick={pay} disabled={phase === "processing"}>
                  {phase === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Pay {formatInrHelper(session.amount)} (test success)</>}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={fail} disabled={phase === "processing"}>Simulate failure</Button>
                  <Button variant="ghost" onClick={cancel} disabled={phase === "processing"}>Cancel</Button>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> The order is marked paid only after the server verifies the payment signature.
              </p>
            </>
          )}

          {phase === "failed" && (
            <div className="space-y-4 py-2 text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-500" />
              <p className="text-sm text-slate-700">{message}</p>
              <div className="flex justify-center gap-2">
                <Button onClick={start}>Try again</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(`/account/orders/${orderId}`);
                    router.refresh();
                    onClose();
                  }}
                >
                  View order
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
