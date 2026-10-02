"use client";

import { useState } from "react";
import { z } from "zod";
import { FileCheck2, Loader2, Upload } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export const GOVERNMENT_ID_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
] as const;

export type GovernmentIdTypeValue = (typeof GOVERNMENT_ID_OPTIONS)[number]["value"];

export interface GovernmentIdValue {
  governmentIdType: GovernmentIdTypeValue | "";
  governmentIdNumber: string;
  governmentIdDocumentId: string;
}

/** What a returned application already holds (the number is shown masked only). */
export interface GovernmentIdOnFile {
  type: GovernmentIdTypeValue;
  maskedNumber: string | null;
  hasDocument: boolean;
}

/** The three values as a form holds them (the type is checked by the API). */
export type GovernmentIdFormValues = Record<keyof GovernmentIdValue, string>;

/** Form fields to merge into a react-hook-form zod object (checked by checkGovernmentId). */
export const governmentIdFormShape = {
  governmentIdType: z.string(),
  governmentIdNumber: z.string().max(40),
  governmentIdDocumentId: z.string(),
};

/**
 * Required mode: type, number and document (a resubmission may keep the
 * number and document on file). Optional mode: all may be left blank; a
 * chosen type needs its number; a number or document needs a type.
 */
export function checkGovernmentId(onFile: GovernmentIdOnFile | null | undefined, options: { optional?: boolean } = {}) {
  return (d: GovernmentIdFormValues, ctx: z.RefinementCtx) => {
    if (!d.governmentIdType) {
      if (!options.optional || d.governmentIdNumber.trim() || d.governmentIdDocumentId) {
        ctx.addIssue({ code: "custom", path: ["governmentIdType"], message: "Select your Government ID type" });
      }
      return;
    }
    const keepsNumber = Boolean(onFile?.maskedNumber && onFile.type === d.governmentIdType);
    if (!d.governmentIdNumber.trim() && !keepsNumber) {
      ctx.addIssue({ code: "custom", path: ["governmentIdNumber"], message: "Enter your Government ID number" });
    }
    if (!options.optional && !d.governmentIdDocumentId && !onFile?.hasDocument) {
      ctx.addIssue({ code: "custom", path: ["governmentIdDocumentId"], message: "Upload your Government ID document" });
    }
  };
}

/** What the API receives: blank number / no new document mean "keep what is on file". */
export function governmentIdPayload(d: GovernmentIdFormValues) {
  return {
    governmentIdType: d.governmentIdType || undefined,
    governmentIdNumber: d.governmentIdNumber.trim() || undefined,
    governmentIdDocumentId: d.governmentIdDocumentId || undefined,
  };
}

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:bg-slate-50";

/**
 * Government ID type, number and document for a Player/Coach application.
 * The document is uploaded as soon as it is chosen (private to the member);
 * the application then refers to it by id. On a resubmission the number and
 * document on file are kept unless replaced.
 */
export function GovernmentIdFields({
  value,
  onChange,
  errors,
  onFile,
  disabled,
  optional,
}: {
  value: GovernmentIdValue;
  onChange: (value: Partial<GovernmentIdValue>) => void;
  errors?: Partial<Record<keyof GovernmentIdValue, string>>;
  onFile?: GovernmentIdOnFile | null;
  disabled?: boolean;
  /** Player applications: the whole section may be left blank. */
  optional?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");
  const sameTypeOnFile = onFile && onFile.type === value.governmentIdType;

  async function upload(file: File) {
    setUploadError("");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await handleApiFetch<{ id: string; fileName: string | null }>(
        await apiFetch("/api/account/documents/government-id", { method: "POST", body })
      );
      setFileName(data.fileName ?? file.name);
      onChange({ governmentIdDocumentId: data.id });
    } catch (err) {
      onChange({ governmentIdDocumentId: "" });
      setFileName("");
      setUploadError(err instanceof Error ? err.message : "Upload failed — try again");
    } finally {
      setUploading(false);
    }
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4" disabled={disabled}>
      <legend className="px-1 text-sm font-semibold text-slate-700">Government ID{optional ? " (optional)" : ""}</legend>
      <p className="text-xs text-slate-500">
        {optional ? "You can submit without it. " : ""}Used only to verify your identity. Visible to you and to the
        officials who review your application.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="governmentIdType">Government ID Type</Label>
          <select
            id="governmentIdType"
            className={SELECT_CLASS}
            value={value.governmentIdType}
            onChange={(e) => onChange({ governmentIdType: e.target.value as GovernmentIdTypeValue | "" })}
          >
            <option value="">Select ID type</option>
            {GOVERNMENT_ID_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors?.governmentIdType && <p className="text-sm text-secondary">{errors.governmentIdType}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="governmentIdNumber">Government ID Number</Label>
          <Input
            id="governmentIdNumber"
            autoComplete="off"
            value={value.governmentIdNumber}
            placeholder={sameTypeOnFile && onFile?.maskedNumber ? `Leave blank to keep ${onFile.maskedNumber}` : "As printed on the document"}
            onChange={(e) => onChange({ governmentIdNumber: e.target.value })}
          />
          {errors?.governmentIdNumber && <p className="text-sm text-secondary">{errors.governmentIdNumber}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="governmentIdDocument">Government ID Document</Label>
        <Input
          id="governmentIdDocument"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </>
          ) : value.governmentIdDocumentId && fileName ? (
            <>
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" /> Uploaded: {fileName}
            </>
          ) : onFile?.hasDocument ? (
            <>
              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" /> The document on file is kept unless you upload a new one.
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" /> PDF, PNG, JPEG or WebP, up to 5 MB.
            </>
          )}
        </p>
        {(uploadError || errors?.governmentIdDocumentId) && (
          <p className="text-sm text-secondary">{uploadError || errors?.governmentIdDocumentId}</p>
        )}
      </div>
    </fieldset>
  );
}
