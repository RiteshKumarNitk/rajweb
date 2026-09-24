"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { rajasthanDistricts } from "@/shared/config/site";
import { apiPost, handleApiFetch } from "@/lib/api-client";
import {
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_DESCRIPTIONS,
  type RequestTypeValue,
} from "@/modules/requests/request-types";

export interface CurrentProfileValues {
  email: string;
  mobile: string;
  district: string;
}

export function NewRequestForm({
  profileType,
  current,
  onDone,
}: {
  profileType: "player" | "coach";
  current: CurrentProfileValues;
  onDone: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<RequestTypeValue | "">("");
  const [reason, setReason] = useState("");
  const [requestedValue, setRequestedValue] = useState("");
  const [requestedMobile, setRequestedMobile] = useState(current.mobile);
  const [requestedEmail, setRequestedEmail] = useState(current.email);
  const [requestedAddress, setRequestedAddress] = useState("");
  const [requestedDistrict, setRequestedDistrict] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      toast.error("Select a request type");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("Please explain your request in at least 10 characters");
      return;
    }
    if (type === "DISTRICT_CHANGE" && !requestedDistrict) {
      toast.error("Select the district you want to move to");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost("/api/requests", {
        profileType,
        type,
        reason: reason.trim(),
        requestedValue: ["PROFILE_CORRECTION", "CERTIFICATE_REQUEST", "CERTIFICATE_CORRECTION", "DOCUMENT_UPDATE", "OTHER"].includes(type)
          ? requestedValue.trim() || undefined
          : undefined,
        requestedMobile: type === "CONTACT_UPDATE" ? requestedMobile.trim() : undefined,
        requestedEmail: type === "CONTACT_UPDATE" ? requestedEmail.trim() : undefined,
        requestedAddress: type === "ADDRESS_UPDATE" ? requestedAddress.trim() : undefined,
        requestedDistrict: type === "DISTRICT_CHANGE" ? requestedDistrict : undefined,
      });
      const { message } = await handleApiFetch<{ requestNumber: string }>(res);
      toast.success(message ?? "Request submitted");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="request-type">Request Type</Label>
        <select
          id="request-type"
          value={type}
          onChange={(e) => setType(e.target.value as RequestTypeValue)}
          className="mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="">Select a request type</option>
          {REQUEST_TYPES.map((t) => (
            <option key={t} value={t}>{REQUEST_TYPE_LABELS[t]}</option>
          ))}
        </select>
        {type && <p className="mt-1.5 text-xs text-slate-500">{REQUEST_TYPE_DESCRIPTIONS[type]}</p>}
      </div>

      {type === "CONTACT_UPDATE" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="requested-mobile">New Mobile Number</Label>
            <Input id="requested-mobile" value={requestedMobile} onChange={(e) => setRequestedMobile(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="requested-email">New Email</Label>
            <Input id="requested-email" type="email" value={requestedEmail} onChange={(e) => setRequestedEmail(e.target.value)} className="mt-1.5" />
          </div>
        </div>
      )}

      {type === "ADDRESS_UPDATE" && (
        <div>
          <Label htmlFor="requested-address">New Address</Label>
          <Textarea id="requested-address" value={requestedAddress} onChange={(e) => setRequestedAddress(e.target.value)} className="mt-1.5" placeholder="Full address" />
        </div>
      )}

      {type === "DISTRICT_CHANGE" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Current District</Label>
            <Input value={current.district} disabled className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="requested-district">Requested District</Label>
            <select
              id="requested-district"
              value={requestedDistrict}
              onChange={(e) => setRequestedDistrict(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Select district</option>
              {rajasthanDistricts.filter((d) => d !== current.district).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {(type === "PROFILE_CORRECTION" || type === "CERTIFICATE_REQUEST" || type === "CERTIFICATE_CORRECTION" || type === "DOCUMENT_UPDATE" || type === "OTHER") && (
        <div>
          <Label htmlFor="requested-value">
            {type === "PROFILE_CORRECTION" ? "What needs to be corrected"
              : type === "CERTIFICATE_REQUEST" ? "Certificate type / details"
              : type === "CERTIFICATE_CORRECTION" ? "What is incorrect on the certificate"
              : type === "DOCUMENT_UPDATE" ? "Which document, and what changed"
              : "Details"}
          </Label>
          <Textarea id="requested-value" value={requestedValue} onChange={(e) => setRequestedValue(e.target.value)} className="mt-1.5" />
        </div>
      )}

      {type && (
        <div>
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5"
            placeholder="Explain why you're making this request"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting || !type}>
          {submitting ? "Submitting..." : "Submit Request"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
