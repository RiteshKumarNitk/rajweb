"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { AddTournamentModal } from "./add-tournament-modal";
import type { OwnerGroup } from "./tournament-owner-options";

export function AddTournamentButton({
  ownerGroups,
  lockedDistrictId,
}: {
  ownerGroups: OwnerGroup[];
  lockedDistrictId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Tournament</Button>
      <AddTournamentModal
        open={open}
        onClose={() => setOpen(false)}
        ownerGroups={ownerGroups}
        lockedDistrictId={lockedDistrictId}
      />
    </>
  );
}
