"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { CoachAccountForm } from "./coach-account-form";

export function CoachRegistrationFlow({
  prefill,
}: {
  prefill: { name: string; email: string; phone: string };
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <CoachAccountForm prefill={prefill} />;
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <GraduationCap className="h-7 w-7 text-accent" />
      </div>
      <h2 className="text-lg font-semibold text-primary">Become a Registered Coach</h2>
      <p className="mx-auto max-w-md text-sm text-slate-500">
        Join RRA&apos;s network of certified coaches. Registered coaches are recognized by the association
        and can be affiliated with district training programs. Your application will be reviewed before
        approval.
      </p>
      <Button onClick={() => setShowForm(true)}>Apply as Coach</Button>
    </div>
  );
}
