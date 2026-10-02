import { FileText } from "lucide-react";

/** Prepared on the server: label, masked number and the protected document URL. */
export interface GovernmentIdCellValue {
  label: string;
  masked: string | null;
  url: string | null;
}

/** Admin table cell: the full number is never sent to the browser. */
export function GovernmentIdCell({ value }: { value: GovernmentIdCellValue | null }) {
  if (!value) return <span className="text-xs italic text-slate-400">Not provided</span>;
  return (
    <div className="space-y-0.5 text-xs">
      <p className="font-medium text-slate-700">{value.label}</p>
      <p className="font-mono text-slate-500">{value.masked}</p>
      {value.url && (
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-secondary hover:underline"
        >
          <FileText className="h-3 w-3" /> View document
        </a>
      )}
    </div>
  );
}
