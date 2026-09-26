"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

const STATUSES = ["NEW", "READ", "REPLIED", "CLOSED"] as const;

export function ContactStatusActions({
  messageId,
  currentStatus,
}: {
  messageId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: (typeof STATUSES)[number]) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/contact/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
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

  async function handleDelete() {
    if (!window.confirm("Delete this contact message permanently?")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/contact/${messageId}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Deleted");
      router.push("/admin/contact");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.filter((s) => s !== currentStatus).map((s) => (
        <Button key={s} variant="outline" size="sm" onClick={() => setStatus(s)} disabled={busy}>
          Mark as {s.toLowerCase()}
        </Button>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="border-red-200 text-red-600 hover:bg-red-50"
        onClick={handleDelete}
        disabled={busy}
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
      </Button>
    </div>
  );
}
