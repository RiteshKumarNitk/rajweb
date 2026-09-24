"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatInr } from "@/modules/account/membership-pricing";
import { formatTournamentSchedule } from "@/modules/tournaments/tournament-dates";

export interface RegisterCategoryOption {
  id: string;
  name: string;
  type: "SINGLES" | "DOUBLES";
  fee: number;
}

interface RegistrationResult {
  id: string;
  tournamentName: string;
  categoryName: string;
  amount: number;
  status: string;
  registeredAt: string;
}

export function TournamentRegisterForm({
  tournamentId,
  categories,
  disabledReason,
}: {
  tournamentId: string;
  categories: RegisterCategoryOption[];
  disabledReason?: string;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const selected = categories.find((category) => category.id === categoryId);

  async function onRegister() {
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch(`/api/tournaments/${tournamentId}/registrations`, {
        method: "POST",
        body: JSON.stringify({ categoryId }),
      });
      const { data } = await handleApiFetch<{ registration: RegistrationResult }>(res);
      setResult(data.registration);
      toast.success("Registration submitted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-primary">{result.tournamentName}</p>
        <p>Category: {result.categoryName}</p>
        <p>Registration ID: <span className="font-mono text-xs">{result.id}</span></p>
        <p>Status: {result.status}</p>
        <p>Registration amount: {formatInr(result.amount)}</p>
        <p>Registered: {formatTournamentSchedule(result.registeredAt)}</p>
      </div>
    );
  }

  if (disabledReason) {
    return <p className="text-sm text-slate-600">{disabledReason}</p>;
  }

  if (categories.length === 0) {
    return <p className="text-sm text-slate-600">No active registration categories are configured for this tournament.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {categories.map((category) => (
          <label key={category.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="categoryId"
                value={category.id}
                checked={categoryId === category.id}
                onChange={() => setCategoryId(category.id)}
              />
              <span className="font-medium text-primary">{category.name}</span>
              <span className="text-xs text-slate-400">{category.type === "SINGLES" ? "Singles" : "Doubles"}</span>
            </span>
            <span>{formatInr(category.fee)}</span>
          </label>
        ))}
      </div>
      {selected && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p className="font-medium text-primary">Registration summary</p>
          <p>{selected.name} · current fee {formatInr(selected.fee)}</p>
          <p className="text-xs text-slate-400">This fee is saved on your registration and does not change if the category price is updated later. Payment is not collected in this step.</p>
        </div>
      )}
      <Button type="button" onClick={onRegister} disabled={busy || !selected}>
        {busy ? "Registering..." : "Confirm registration"}
      </Button>
    </div>
  );
}
