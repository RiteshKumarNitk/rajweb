import type { GovernmentIdType } from "@prisma/client";
import { FileText } from "lucide-react";
import { GOVERNMENT_ID_LABELS, maskGovernmentIdNumber } from "@/modules/applications/government-id";
import { mediaUrl } from "@/modules/media/media-asset.service";

/** Government ID on an application: type, masked number and a link to the private document. */
export function GovernmentIdSummary({
  type,
  number,
  documentId,
}: {
  type: GovernmentIdType | null;
  number: string | null;
  documentId: string | null;
}) {
  if (!type) return <p className="mt-0.5 font-semibold text-slate-500">Not provided</p>;
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-semibold text-slate-800">
        {GOVERNMENT_ID_LABELS[type]} · <span className="font-mono">{maskGovernmentIdNumber(number)}</span>
      </span>
      {documentId && (
        <a
          href={mediaUrl(documentId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
        >
          <FileText className="h-3.5 w-3.5" /> View document
        </a>
      )}
    </div>
  );
}

/** Prefill for a resubmission: never the full number. */
export function governmentIdOnFile(record: {
  governmentIdType: GovernmentIdType | null;
  governmentIdNumber: string | null;
  governmentIdDocumentId: string | null;
}) {
  return record.governmentIdType
    ? {
        type: record.governmentIdType,
        maskedNumber: maskGovernmentIdNumber(record.governmentIdNumber),
        hasDocument: Boolean(record.governmentIdDocumentId),
      }
    : null;
}
