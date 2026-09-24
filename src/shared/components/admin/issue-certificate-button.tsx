"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { IssuePlayerCertificateModal, type EligiblePlayer } from "./issue-player-certificate-modal";

export function IssueCertificateButton({
  players,
  label = "Issue Certificate",
}: {
  players: EligiblePlayer[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      <IssuePlayerCertificateModal open={open} onClose={() => setOpen(false)} players={players} />
    </>
  );
}
