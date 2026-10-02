import { Clock } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

/** Shown on the Player/Coach portal while the application waits for district review. */
export function ApplicationPendingNotice({
  kind,
  submittedAt,
  stateName,
  districtName,
}: {
  kind: "player" | "coach";
  submittedAt: Date;
  stateName: string | null;
  districtName: string;
}) {
  const fields = [
    { label: "Status", value: <StatusBadge status="PENDING" label="Pending Approval" /> },
    { label: "Submitted", value: formatDate(submittedAt) },
    { label: "State", value: stateName ?? "—" },
    { label: "District", value: districtName },
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/70" data-testid="application-pending">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="font-bold text-amber-950">Your {kind} application is under review.</p>
            <p className="text-sm text-amber-900/80">
              Your district association will approve it or return it with a reason. You can&apos;t submit another {kind}{" "}
              application while this one is pending.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.label} className="rounded-lg border border-amber-200/70 bg-white/70 p-3">
                <dt className="text-xs text-slate-500">{f.label}</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
