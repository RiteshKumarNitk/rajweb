"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { AddTournamentModal, type DistrictOption } from "./add-tournament-modal";

export function AddTournamentButton({
  districts,
  lockedDistrictId,
}: {
  districts: DistrictOption[];
  lockedDistrictId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add Tournament</Button>
      <AddTournamentModal
        open={open}
        onClose={() => setOpen(false)}
        districts={districts}
        lockedDistrictId={lockedDistrictId}
      />
    </>
  );
}
