"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { NewRequestForm, type CurrentProfileValues } from "@/shared/components/requests/new-request-form";

/**
 * "Edit Profile" for an APPROVED player. Approved details are never changed
 * directly: the form sends a change request (existing workflow, reviewed by
 * the district/state/Super Admin). Cancel or a successful submit returns to
 * the read-only profile.
 */
export function PlayerEditProfile({ current }: { current: CurrentProfileValues }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Your approved details are read-only. Changes — including your district — are sent to your association for approval.
        </p>
        <Button size="sm" className="shrink-0" onClick={() => setEditing(true)}>
          <PencilLine className="h-4 w-4" /> Edit Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" data-testid="player-edit-profile">
      <p className="mb-1 text-base font-bold text-primary">Request a change</p>
      <p className="mb-4 text-xs text-slate-500">
        Choose what to change. Your association reviews the request; the profile updates once it is approved.
      </p>
      <NewRequestForm profileType="player" current={current} onDone={() => setEditing(false)} />
    </div>
  );
}
