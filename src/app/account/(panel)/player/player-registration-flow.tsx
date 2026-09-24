"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { PlayerAccountForm } from "./player-account-form";

export function PlayerRegistrationFlow({
  prefill,
}: {
  prefill: { name: string; email: string; phone: string };
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <PlayerAccountForm prefill={prefill} />;
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <UserCheck className="h-7 w-7 text-accent" />
      </div>
      <h2 className="text-lg font-semibold text-primary">Become a Registered Player</h2>
      <p className="mx-auto max-w-md text-sm text-slate-500">
        Register as an official RRA player to take part in sanctioned state tournaments, ranking events, and
        selection trials. Your application will be reviewed by your district association before approval.
      </p>
      <Button onClick={() => setShowForm(true)}>Apply for Player Registration</Button>
    </div>
  );
}
