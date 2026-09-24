"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export function RequestReviewActions({
  id,
  status,
  canApprove,
}: {
  id: string;
  status: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState("");

  if (status !== "PENDING") {
    return <div className="text-sm text-slate-500">This request has already been reviewed. No further action is available.</div>;
  }

  if (!canApprove) {
    return <div className="text-sm text-slate-500">You do not have permission to approve or reject this request.</div>;
  }

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/requests/${id}/approve`, { method: "POST" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Request approved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Request rejected");
      setShowRejectModal(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-600">Review Decision</p>
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={loading} className="flex-1">
            {loading ? "..." : "Approve"}
          </Button>
          <Button variant="outline" onClick={() => setShowRejectModal(true)} disabled={loading} className="flex-1">
            Reject
          </Button>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Reject Request</CardTitle>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="reject-reason" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason <span className="text-secondary">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="e.g. Supporting document required."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <p className="mt-1 text-xs text-slate-400">The user will see this reason on their request.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRejectModal(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleReject} disabled={loading || !reason.trim()}>
                  {loading ? "..." : "Reject Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
