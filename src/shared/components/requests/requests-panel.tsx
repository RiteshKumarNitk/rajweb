"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import {
  GENDER_LABELS,
  PROFILE_FIELD_LABELS,
  REQUEST_TYPE_LABELS,
  type ProfileFieldValue,
  type RequestTypeValue,
} from "@/modules/requests/request-types";
import { NewRequestForm, type CurrentProfileValues } from "./new-request-form";

export interface RequestRow {
  id: string;
  requestNumber: string;
  type: RequestTypeValue;
  status: string;
  reason: string;
  requestedValue: string | null;
  /** PROFILE_CORRECTION field, when one was named. */
  requestedField?: string | null;
  /** What was on file when the request was made (recorded by the server). */
  currentValue?: string | null;
  requestedMobile: string | null;
  requestedEmail: string | null;
  requestedAddress: string | null;
  requestedDistrict: string | null;
  adminRemarks: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt?: string;
  resolvedAt: string | null;
  /** "Player" / "Coach" — shown when one list holds both. */
  profileLabel?: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function fieldValue(field: string, value: string | null | undefined): string {
  if (!value) return "—";
  return field === "GENDER" ? (GENDER_LABELS[value] ?? value) : value;
}

function requestDetail(r: RequestRow): string | null {
  if (r.requestedField) {
    const label = PROFILE_FIELD_LABELS[r.requestedField as ProfileFieldValue] ?? r.requestedField;
    return `${label}: ${fieldValue(r.requestedField, r.currentValue)} → ${fieldValue(r.requestedField, r.requestedValue)}`;
  }
  if (r.type === "CONTACT_UPDATE") {
    const parts = [r.requestedMobile ? `Mobile: ${r.requestedMobile}` : null, r.requestedEmail ? `Email: ${r.requestedEmail}` : null].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }
  if (r.type === "ADDRESS_UPDATE") return r.requestedAddress;
  if (r.type === "DISTRICT_CHANGE") {
    return r.requestedDistrict ? `District: ${r.currentValue ?? "—"} → ${r.requestedDistrict}` : null;
  }
  return r.requestedValue;
}

/**
 * The member's own requests: Request · Type · Submitted · Status · Last
 * Updated · Action. A PENDING request can be cancelled (after confirmation);
 * once an admin has acted it cannot. With `profileType`, new requests can be
 * raised for that Player/Coach registration.
 */
export function RequestsPanel({
  profileType,
  current,
  requests,
  startOpen = false,
  title = "My Requests",
}: {
  profileType?: "player" | "coach";
  current?: CurrentProfileValues;
  requests: RequestRow[];
  /** Open the new-request form straight away (e.g. from "Edit Profile"). */
  startOpen?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const canCreate = Boolean(profileType && current);
  const [showForm, setShowForm] = useState(startOpen && canCreate);
  const [confirming, setConfirming] = useState<RequestRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelled, setCancelled] = useState<Record<string, string>>({});
  const rows = requests.map((r) => (cancelled[r.id] ? { ...r, status: "CANCELLED", updatedAt: cancelled[r.id] } : r));
  const pending = rows.filter((r) => r.status === "PENDING");

  async function cancelRequest(row: RequestRow) {
    setBusy(true);
    try {
      const { message } = await handleApiFetch(await apiFetch(`/api/account/requests/${row.id}/cancel`, { method: "POST" }));
      setCancelled((c) => ({ ...c, [row.id]: new Date().toISOString() }));
      toast.success(message ?? "Request cancelled");
      setConfirming(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel the request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-accent" /> {title}
        </CardTitle>
        {canCreate && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Request
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && profileType && current ? (
          <NewRequestForm profileType={profileType} current={current} onDone={() => setShowForm(false)} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="You have not submitted any requests."
            description={
              canCreate
                ? "Need something changed — district, contact info, a certificate? Submit a request here."
                : "Requests you make from your Player or Coach area appear here."
            }
          />
        ) : (
          <div className="space-y-3" data-testid="request-list">
            {pending.length > 0 && (
              <p className="text-xs font-medium text-slate-500">
                {pending.length} pending request{pending.length > 1 ? "s" : ""}
              </p>
            )}
            <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-3 px-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
              <span>Request</span>
              <span>Type</span>
              <span>Submitted</span>
              <span>Status</span>
              <span>Last Updated</span>
              <span className="w-32 text-right">Action</span>
            </div>
            {rows.map((r) => {
              const detail = requestDetail(r);
              return (
                <div key={r.id} className="rounded-lg border border-slate-200 p-4" data-request={r.requestNumber}>
                  <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_0.8fr_auto] lg:items-center lg:gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-slate-500">{r.requestNumber}</p>
                      {r.profileLabel && <p className="text-[11px] text-slate-400">{r.profileLabel}</p>}
                    </div>
                    <p className="text-sm font-semibold text-primary">{REQUEST_TYPE_LABELS[r.type]}</p>
                    <p className="text-xs text-slate-600">
                      <span className="text-slate-400 lg:hidden">Submitted </span>
                      {formatDate(r.createdAt)}
                    </p>
                    <div>
                      <StatusBadge status={r.status} label={STATUS_LABELS[r.status] ?? r.status} />
                    </div>
                    <p className="text-xs text-slate-600">
                      <span className="text-slate-400 lg:hidden">Last updated </span>
                      {formatDate(r.updatedAt ?? r.resolvedAt ?? r.createdAt)}
                    </p>
                    <div className="lg:w-32 lg:text-right">
                      {r.status === "PENDING" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setConfirming(r)}
                        >
                          Cancel Request
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                  {detail && <p className="mt-2 text-sm text-slate-600">{detail}</p>}
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="text-slate-400">Reason: </span>
                    {r.reason}
                  </p>
                  {r.resolvedAt && r.status !== "CANCELLED" && (
                    <p className="mt-1 text-xs text-slate-500">Processed {formatDate(r.resolvedAt)}</p>
                  )}
                  {r.status === "REJECTED" && r.rejectionReason && (
                    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-secondary">
                      <span className="font-semibold">Not approved.</span> {r.rejectionReason}
                    </p>
                  )}
                  {r.status === "APPROVED" && r.adminRemarks && (
                    <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{r.adminRemarks}</p>
                  )}
                  {r.status === "CANCELLED" && <p className="mt-2 text-xs text-slate-500">You cancelled this request.</p>}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">Are you sure you want to cancel this request?</p>
              <p className="text-sm text-slate-600">
                {confirming.requestNumber} · {REQUEST_TYPE_LABELS[confirming.type]}. It stays in your history as cancelled.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
                  Keep request
                </Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => cancelRequest(confirming)} disabled={busy}>
                  {busy ? "Cancelling…" : "Cancel Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
