"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { AcademyMembershipForm, type AcademyResubmitData } from "./academy-membership-form";

export function AcademyResubmitActions({
  reason,
  prefill,
  resubmit,
}: {
  reason: string | null;
  prefill: { directorName: string; email: string; phone: string };
  resubmit: AcademyResubmitData;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-primary">Correct and Resubmit</p>
        <AcademyMembershipForm prefill={prefill} resubmit={resubmit} />
      </div>
    );
  }

  return (
    <div className="rounded-md bg-red-50 px-3 py-2">
      <p className="text-secondary">
        <span className="font-semibold">Not approved.</span> {reason || "Contact your district association for details."}
      </p>
      <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(true)}>
        Correct & Resubmit
      </Button>
    </div>
  );
}
