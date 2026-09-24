"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export type EligiblePlayer = {
  id: string;
  playerId: string;
  name: string;
  email: string;
  district: string;
};

export type PlayerCertificateInfo = {
  certificateNumber: string;
  qrCode: string;
  issuedAt: string;
  expiresAt: string | null;
  pdfUrl?: string;
};

const issueSchema = z.object({
  playerId: z.string().min(1, "Please select a player"),
  certificateNumber: z.string().optional(),
  issuedAt: z.string().min(1, "Issue date is required"),
  expiresAt: z.string().min(1, "Expiry date is required"),
});

type IssueFormData = z.infer<typeof issueSchema>;

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IssuePlayerCertificateModal({
  open,
  onClose,
  players,
  preselectedPlayerId,
}: {
  open: boolean;
  onClose: () => void;
  players: EligiblePlayer[];
  preselectedPlayerId?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      playerId: preselectedPlayerId ?? "",
      certificateNumber: "",
      issuedAt: todayIso(),
      expiresAt: defaultExpiry(),
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        playerId: preselectedPlayerId ?? "",
        certificateNumber: "",
        issuedAt: todayIso(),
        expiresAt: defaultExpiry(),
      });
    }
  }, [open, preselectedPlayerId, reset]);

  const selectedId = watch("playerId");
  const selectedPlayer = players.find((p) => p.id === selectedId);

  async function onSubmit(data: IssueFormData) {
    try {
      const res = await apiFetch(`/api/admin/players/${data.playerId}/certificate`, {
        method: "POST",
        body: JSON.stringify({
          certificateNumber: data.certificateNumber?.trim() || undefined,
          issuedAt: data.issuedAt,
          expiresAt: data.expiresAt,
        }),
      });
      const { data: result, message } = await handleApiFetch<{ certificateNumber: string }>(res);
      toast.success(message ?? `Certificate ${result.certificateNumber} issued`);
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue certificate");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Issue Player Certificate</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Select player and enter certificate details</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="text-sm text-slate-500">
              No approved players without a certificate. Approve a player first from the Players page.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playerId">Select Player</Label>
                <select
                  id="playerId"
                  className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:bg-slate-100"
                  {...register("playerId")}
                  disabled={Boolean(preselectedPlayerId)}
                >
                  <option value="">Choose approved player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.playerId}) — {p.district}
                    </option>
                  ))}
                </select>
                {errors.playerId && <p className="text-sm text-secondary">{errors.playerId.message}</p>}
              </div>

              {selectedPlayer && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-medium text-primary">{selectedPlayer.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{selectedPlayer.playerId}</p>
                  <p className="mt-1 text-slate-500">
                    {selectedPlayer.district} · {selectedPlayer.email}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Certificate Number (optional)</Label>
                <Input id="certificateNumber" placeholder="Auto-generated if left blank" {...register("certificateNumber")} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="issuedAt">Issue Date</Label>
                  <Input id="issuedAt" type="date" {...register("issuedAt")} />
                  {errors.issuedAt && <p className="text-sm text-secondary">{errors.issuedAt.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Valid Until</Label>
                  <Input id="expiresAt" type="date" {...register("expiresAt")} />
                  {errors.expiresAt && <p className="text-sm text-secondary">{errors.expiresAt.message}</p>}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Issuing..." : "Issue Certificate"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


