"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatInr, type MembershipPricing } from "@/modules/account/membership-pricing";
import { ClubMembershipForm } from "./club-membership-form";

export function ClubRegistrationFlow({
  prefill,
  pricing,
}: {
  prefill: { contactPerson: string; email: string; phone: string };
  pricing: MembershipPricing;
}) {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <ClubMembershipForm prefill={prefill} />;
  }

  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
        <Building2 className="h-7 w-7 text-accent" />
      </div>
      <h2 className="text-lg font-semibold text-primary">Register Your Club</h2>
      <p className="mx-auto max-w-md text-sm text-slate-500">
        Affiliate your club with RRA to access sanctioned tournaments, coach certification programs, and
        official recognition across Rajasthan.
      </p>
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
        <div>
          <p className="text-xs text-slate-500">New Membership</p>
          <p className="text-lg font-bold text-primary">{formatInr(pricing.new)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Renewal</p>
          <p className="text-lg font-bold text-primary">{formatInr(pricing.renewal)}</p>
        </div>
      </div>
      <p className="text-xs text-slate-400">Fee is payable upon approval. Online payment is not yet enabled.</p>
      <Button onClick={() => setShowForm(true)}>Apply for Club Membership</Button>
    </div>
  );
}
