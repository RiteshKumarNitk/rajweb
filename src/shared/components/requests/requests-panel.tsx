"use client";

import { useState } from "react";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
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
  resolvedAt: string | null;
}

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

export function RequestsPanel({
  profileType,
  current,
  requests,
  startOpen = false,
}: {
  profileType: "player" | "coach";
  current: CurrentProfileValues;
  requests: RequestRow[];
  /** Open the new-request form straight away (e.g. from "Request Change"). */
  startOpen?: boolean;
}) {
  const [showForm, setShowForm] = useState(startOpen);
  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-accent" /> My Requests
        </CardTitle>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Request
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm ? (
          <NewRequestForm profileType={profileType} current={current} onDone={() => setShowForm(false)} />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Need something changed — district, contact info, a certificate? Submit a request here."
          />
        ) : (
          <div className="space-y-3">
            {pending.length > 0 && (
              <p className="text-xs font-medium text-slate-500">{pending.length} pending request{pending.length > 1 ? "s" : ""}</p>
            )}
            {requests.map((r) => {
              const detail = requestDetail(r);
              return (
                <div key={r.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-slate-400">{r.requestNumber}</p>
                      <p className="text-sm font-semibold text-primary">{REQUEST_TYPE_LABELS[r.type]}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Submitted {formatDate(r.createdAt)}
                    {r.resolvedAt ? ` · Processed ${formatDate(r.resolvedAt)}` : ""}
                  </p>
                  {detail && <p className="mt-1 text-sm text-slate-600">{detail}</p>}
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="text-slate-400">Reason: </span>{r.reason}
                  </p>
                  {r.status === "REJECTED" && r.rejectionReason && (
                    <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-secondary">
                      <span className="font-semibold">Not approved.</span> {r.rejectionReason}
                    </p>
                  )}
                  {r.status === "APPROVED" && r.adminRemarks && (
                    <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{r.adminRemarks}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
