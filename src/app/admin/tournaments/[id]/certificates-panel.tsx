"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export interface SignatoryOption {
  id: string;
  name: string;
  designation: string;
  scopeName: string;
}

export interface CertificateCandidate {
  playerId: string;
  playerName: string;
  playerCode: string;
  categoryName: string | null;
  registrationStatus: string;
  certificateNumber: string | null;
  pdfUrl: string | null;
}

interface Props {
  tournamentId: string;
  status: string;
  certificateTitle: string | null;
  certificateLogoUrl: string | null;
  availableSignatories: SignatoryOption[];
  assignedSignatoryIds: string[];
  candidates: CertificateCandidate[];
  canManageSettings: boolean;
  canIssue: boolean;
}

const ELIGIBLE = new Set(["PENDING", "APPROVED"]);

export function CertificatesPanel(props: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(props.certificateTitle ?? "");
  const [logo, setLogo] = useState(props.certificateLogoUrl ?? "");
  // Ordered selection: array position = signing order.
  const [signers, setSigners] = useState<string[]>(props.assignedSignatoryIds);
  const [savingSettings, setSavingSettings] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, string>>({});
  const [issuing, setIssuing] = useState(false);

  const completed = props.status === "COMPLETED";

  function toggleSigner(id: string) {
    setSigners((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : prev.length >= 4 ? prev : [...prev, id]));
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await apiFetch(`/api/admin/tournaments/${props.tournamentId}/certificate-settings`, {
        method: "PUT",
        body: JSON.stringify({ certificateTitle: title.trim() || null, certificateLogoUrl: logo.trim() || null, signatoryIds: signers }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save certificate settings");
    } finally {
      setSavingSettings(false);
    }
  }

  async function issue() {
    const entries = props.candidates
      .filter((c) => selected[c.playerId])
      .map((c) => ({ playerId: c.playerId, position: positions[c.playerId]?.trim() || null }));
    if (entries.length === 0) {
      toast.error("Select at least one player");
      return;
    }
    setIssuing(true);
    try {
      const res = await apiFetch(`/api/admin/tournaments/${props.tournamentId}/certificates`, {
        method: "POST",
        body: JSON.stringify({ entries }),
      });
      const { data, message } = await handleApiFetch<{ skipped: { reason: string }[] }>(res);
      toast.success(message ?? "Certificates issued");
      for (const s of data.skipped.slice(0, 3)) toast.info(s.reason);
      setSelected({});
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue certificates");
    } finally {
      setIssuing(false);
    }
  }

  const eligible = props.candidates.filter((c) => ELIGIBLE.has(c.registrationStatus) && !c.certificateNumber);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Certificate settings for this tournament</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cert-title">Certificate title</Label>
            <Input
              id="cert-title"
              value={title}
              maxLength={120}
              placeholder="Certificate of Participation"
              disabled={!props.canManageSettings}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-logo">Logo (optional)</Label>
            <Input
              id="cert-logo"
              value={logo}
              maxLength={500}
              placeholder="/images/district-logo.png or https://…"
              disabled={!props.canManageSettings}
              onChange={(e) => setLogo(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Signatories (in signing order, up to 4)</Label>
          {props.availableSignatories.length === 0 ? (
            <p className="text-sm text-amber-700">
              No active signatories are available to this tournament. Add them under Certificates → Signatories.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {props.availableSignatories.map((s) => {
                const order = signers.indexOf(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={order >= 0}
                      disabled={!props.canManageSettings || (order < 0 && signers.length >= 4)}
                      onChange={() => toggleSigner(s.id)}
                      aria-label={`Sign with ${s.name}`}
                    />
                    <span className="w-6 text-xs font-bold text-slate-500">{order >= 0 ? `#${order + 1}` : ""}</span>
                    <span className="font-medium text-slate-900">{s.name}</span>
                    <span className="text-slate-500">— {s.designation}</span>
                    <span className="ml-auto text-xs text-slate-400">{s.scopeName}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {props.canManageSettings && (
          <Button size="sm" onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving…" : "Save certificate settings"}
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Issue certificates</h3>
        {!completed ? (
          <p className="text-sm text-slate-500">
            Certificates can be generated once the tournament status is <strong>Completed</strong>.
          </p>
        ) : props.candidates.length === 0 ? (
          <p className="text-sm text-slate-500">No registrations for this tournament.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-2 font-medium">
                      {props.canIssue && eligible.length > 0 && (
                        <input
                          type="checkbox"
                          aria-label="Select all eligible"
                          checked={eligible.every((c) => selected[c.playerId])}
                          onChange={(e) =>
                            setSelected(Object.fromEntries(eligible.map((c) => [c.playerId, e.target.checked])))
                          }
                        />
                      )}
                    </th>
                    <th className="pb-2 pr-4 font-medium">Player</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium">Achievement (optional)</th>
                    <th className="pb-2 font-medium">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {props.candidates.map((c) => {
                    const canPick = props.canIssue && ELIGIBLE.has(c.registrationStatus) && !c.certificateNumber;
                    return (
                      <tr key={c.playerId} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-2">
                          {canPick && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${c.playerName}`}
                              checked={Boolean(selected[c.playerId])}
                              onChange={(e) => setSelected((prev) => ({ ...prev, [c.playerId]: e.target.checked }))}
                            />
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <p className="font-medium text-primary">{c.playerName}</p>
                          <p className="font-mono text-xs text-slate-400">{c.playerCode}</p>
                        </td>
                        <td className="py-2 pr-4">{c.categoryName ?? "—"}</td>
                        <td className="py-2 pr-4">
                          {canPick ? (
                            <Input
                              value={positions[c.playerId] ?? ""}
                              maxLength={120}
                              placeholder="e.g. Winner — Senior Singles"
                              onChange={(e) => setPositions((prev) => ({ ...prev, [c.playerId]: e.target.value }))}
                              className="h-8"
                            />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          {c.certificateNumber ? (
                            c.pdfUrl ? (
                              <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">
                                {c.certificateNumber}
                              </a>
                            ) : (
                              <span className="font-mono text-xs">{c.certificateNumber}</span>
                            )
                          ) : ELIGIBLE.has(c.registrationStatus) ? (
                            <span className="text-xs text-slate-400">Not issued</span>
                          ) : (
                            <span className="text-xs text-slate-400">Not eligible ({c.registrationStatus})</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {props.canIssue && eligible.length > 0 && (
              <Button size="sm" onClick={issue} disabled={issuing || props.assignedSignatoryIds.length === 0}>
                {issuing ? "Generating…" : "Generate certificates for selected players"}
              </Button>
            )}
            {props.assignedSignatoryIds.length === 0 && (
              <p className="text-xs text-amber-700">Save at least one signatory above before generating certificates.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
