"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { CERTIFICATE_ACHIEVEMENTS, DEFAULT_ACHIEVEMENT } from "@/services/certificates/templates/positions";

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
  parentName: string | null;
  registrationCategory: string | null;
  registrationStatus: string;
  certificate: { id: string; number: string; position: string | null; isRevoked: boolean; pdfUrl: string } | null;
}

export interface CertificateSettings {
  certificateTemplateId: string | null;
  certificateTitle: string | null;
  certificateOrganizedBy: string | null;
  certificateRecognizedBy: string[];
  /** YYYY-MM-DD (India) or null. */
  certificateIssueDate: string | null;
  certificateNumberPrefix: string | null;
  certificateNumberStart: number;
  certificateNumberPadding: number;
  certificateCategoryOptions: string[];
  certificateEventOptions: string[];
  signatories: { signatoryId: string; title: string | null }[];
}

type IssueOptions =
  | { ok: false; reason: string }
  | {
      ok: true;
      template: { id: string; name: string; version: number; positions: string[] };
      categoryOptions: string[];
      eventOptions: string[];
      defaults: Record<string, { category: string | null; event: string | null; parentName: string | null }>;
      nextNumber: string | null;
    };

interface Props {
  tournamentId: string;
  status: string;
  settings: CertificateSettings;
  suggestedOptions: { categories: string[]; events: string[] };
  templates: { id: string; label: string; isDefault: boolean }[];
  availableSignatories: SignatoryOption[];
  issueOptions: IssueOptions;
  candidates: CertificateCandidate[];
  canManageSettings: boolean;
  canIssue: boolean;
}

interface RowChoice {
  category: string;
  event: string;
  achievement: string;
  parentName: string;
}

interface IssueReport {
  issued: { playerName: string; certificateNumber: string; pdfUrl: string; pdfStored: boolean }[];
  failed: { playerName: string | null; playerId: string; reason: string }[];
}

const ELIGIBLE = new Set(["PENDING", "APPROVED"]);
const CHUNK = 25;
const selectClass = "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-sm disabled:bg-slate-100";
const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

export function CertificatesPanel(props: Props) {
  const router = useRouter();
  const s = props.settings;
  const [templateId, setTemplateId] = useState(s.certificateTemplateId ?? "");
  const [title, setTitle] = useState(s.certificateTitle ?? "");
  const [organizedBy, setOrganizedBy] = useState(s.certificateOrganizedBy ?? "");
  const [recognizedBy, setRecognizedBy] = useState(s.certificateRecognizedBy.join("\n"));
  const [issueDate, setIssueDate] = useState(s.certificateIssueDate ?? "");
  const [prefix, setPrefix] = useState(s.certificateNumberPrefix ?? "");
  const [start, setStart] = useState(String(s.certificateNumberStart));
  const [padding, setPadding] = useState(String(s.certificateNumberPadding));
  const [categoryOptions, setCategoryOptions] = useState(s.certificateCategoryOptions.join("\n"));
  const [eventOptions, setEventOptions] = useState(s.certificateEventOptions.join("\n"));
  // Ordered selection: array position = signing order.
  const [signers, setSigners] = useState(s.signatories.map((x) => ({ signatoryId: x.signatoryId, title: x.title ?? "" })));
  const [savingSettings, setSavingSettings] = useState(false);

  const opts = props.issueOptions;
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [choices, setChoices] = useState<Record<string, RowChoice>>(() =>
    Object.fromEntries(
      props.candidates.map((c) => {
        const d = opts.ok ? opts.defaults[c.playerId] : undefined;
        return [c.playerId, { category: d?.category ?? "", event: d?.event ?? "", achievement: DEFAULT_ACHIEVEMENT, parentName: "" }];
      })
    )
  );
  const [bulk, setBulk] = useState<RowChoice>({ category: "", event: "", achievement: "", parentName: "" });
  const [issuing, setIssuing] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<IssueReport | null>(null);

  const completed = props.status === "COMPLETED";
  const positions = useMemo(
    () => CERTIFICATE_ACHIEVEMENTS.filter((a) => (opts.ok ? opts.template.positions.includes(a.code) : true)),
    [opts]
  );
  const eligible = props.candidates.filter((c) => ELIGIBLE.has(c.registrationStatus) && !c.certificate);
  const selectedRows = eligible.filter((c) => selected[c.playerId]);
  const sampleNumber = prefix.trim()
    ? `${prefix.trim().replace(/\/+$/, "")}/${String(Math.max(1, Number(start) || 1)).padStart(Math.max(1, Number(padding) || 1), "0")}`
    : null;

  function toggleSigner(id: string) {
    setSigners((prev) =>
      prev.some((x) => x.signatoryId === id)
        ? prev.filter((x) => x.signatoryId !== id)
        : prev.length >= 4
          ? prev
          : [...prev, { signatoryId: id, title: "" }]
    );
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const res = await apiFetch(`/api/admin/tournaments/${props.tournamentId}/certificate-settings`, {
        method: "PUT",
        body: JSON.stringify({
          certificateTemplateId: templateId || null,
          certificateTitle: title.trim() || null,
          certificateOrganizedBy: organizedBy.trim() || null,
          certificateRecognizedBy: lines(recognizedBy),
          certificateIssueDate: issueDate || null,
          certificateNumberPrefix: prefix.trim() || null,
          certificateNumberStart: Math.max(1, Math.trunc(Number(start) || 1)),
          certificateNumberPadding: Math.min(6, Math.max(1, Math.trunc(Number(padding) || 2))),
          certificateCategoryOptions: lines(categoryOptions),
          certificateEventOptions: lines(eventOptions),
          signatories: signers.map((x) => ({ signatoryId: x.signatoryId, title: x.title.trim() || null })),
        }),
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

  const entryFor = (c: CertificateCandidate) => {
    const ch = choices[c.playerId];
    return {
      playerId: c.playerId,
      category: ch.category || null,
      event: ch.event || null,
      achievement: ch.achievement,
      parentName: c.parentName ? null : ch.parentName.trim() || null,
    };
  };

  async function preview(c: CertificateCandidate) {
    // Open the tab now (inside the click) so popup blockers allow it.
    const tab = window.open("", "_blank");
    try {
      const res = await apiFetch(`/api/admin/tournaments/${props.tournamentId}/certificates/preview`, {
        method: "POST",
        body: JSON.stringify(entryFor(c)),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? "Preview failed");
      }
      const url = URL.createObjectURL(await res.blob());
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : "Preview failed");
    }
  }

  function applyBulk() {
    if (!selectedRows.length) return toast.error("Select players first");
    setChoices((prev) => {
      const next = { ...prev };
      for (const c of selectedRows) {
        next[c.playerId] = {
          ...next[c.playerId],
          ...(bulk.category ? { category: bulk.category } : {}),
          ...(bulk.event ? { event: bulk.event } : {}),
          ...(bulk.achievement ? { achievement: bulk.achievement } : {}),
        };
      }
      return next;
    });
  }

  async function issue() {
    if (!selectedRows.length) return toast.error("Select at least one player");
    if (!window.confirm(`Issue ${selectedRows.length} certificate(s)? Issued certificates cannot be edited.`)) return;
    const entries = selectedRows.map(entryFor);
    const nameOf = new Map(selectedRows.map((c) => [c.playerId, c.playerName]));
    const combined: IssueReport = { issued: [], failed: [] };
    setReport(null);
    setIssuing({ done: 0, total: entries.length });
    // Sequential chunks keep numbering in table order and each request short.
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      try {
        const res = await apiFetch(`/api/admin/tournaments/${props.tournamentId}/certificates`, {
          method: "POST",
          body: JSON.stringify({ entries: chunk }),
        });
        const { data } = await handleApiFetch<IssueReport>(res);
        combined.issued.push(...data.issued);
        combined.failed.push(...data.failed);
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Request failed";
        combined.failed.push(...chunk.map((e) => ({ playerId: e.playerId, playerName: nameOf.get(e.playerId) ?? null, reason })));
      }
      setIssuing({ done: Math.min(entries.length, i + CHUNK), total: entries.length });
    }
    setIssuing(null);
    setReport(combined);
    setSelected({});
    if (combined.issued.length) toast.success(`${combined.issued.length} certificate(s) issued`);
    if (combined.failed.length) toast.error(`${combined.failed.length} not issued — see the report below`);
    router.refresh();
  }

  const signerById = new Map(props.availableSignatories.map((x) => [x.id, x]));

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Certificate settings for this tournament</h3>
        <fieldset disabled={!props.canManageSettings || savingSettings} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cert-template">Certificate template</Label>
              <select id="cert-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">Default template</option>
                {props.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-title">Certificate heading (optional)</Label>
              <Input id="cert-title" value={title} maxLength={60} placeholder="From template (e.g. Certificate)" onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-org">Organized By</Label>
              <Input id="cert-org" value={organizedBy} maxLength={150} placeholder="e.g. Jaipur Racquetball Association" onChange={(e) => setOrganizedBy(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-date">Certificate issue date</Label>
              <Input id="cert-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              <p className="text-xs text-slate-500">Leave empty to print the day each certificate is issued.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cert-recognized">Recognized By (one per line)</Label>
            <Textarea id="cert-recognized" rows={4} value={recognizedBy} onChange={(e) => setRecognizedBy(e.target.value)} placeholder={"Rajasthan Racquetball Association\nIndian Racquetball Association"} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="cert-prefix">Number prefix</Label>
              <Input id="cert-prefix" value={prefix} maxLength={40} placeholder="RRA/STC/1OP" onChange={(e) => setPrefix(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-start">Starting number</Label>
              <Input id="cert-start" type="number" min={1} value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cert-padding">Digits (padding)</Label>
              <Input id="cert-padding" type="number" min={1} max={6} value={padding} onChange={(e) => setPadding(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            First number: <span className="font-mono font-semibold text-slate-700">{sampleNumber ?? "— set a prefix"}</span>
            {opts.ok && opts.nextNumber && (
              <>
                {" · "}Next to be issued (saved settings): <span className="font-mono font-semibold text-slate-700">{opts.nextNumber}</span>
              </>
            )}
            . Numbers are allocated automatically and never reused.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Category options", categoryOptions, setCategoryOptions, props.suggestedOptions.categories, "Sub-Junior\nJunior\nSenior"],
                ["Event options", eventOptions, setEventOptions, props.suggestedOptions.events, "Single\nDouble\nMixed Double"],
              ] as const
            ).map(([label, value, set, suggested, placeholder]) => (
              <div key={label} className="space-y-1.5">
                <Label>{label} (printed in order; one per line)</Label>
                <Textarea rows={4} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                {suggested.length > 0 && (
                  <p className="text-xs text-slate-500">
                    From registrations: {suggested.join(", ")}{" "}
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => set(suggested.join("\n"))}>
                      Use these
                    </button>
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>Signatories (in signing order, up to 4)</Label>
            {props.availableSignatories.length === 0 ? (
              <p className="text-sm text-amber-700">No active signatories are available to this tournament. Add them under Certificates → Signatories.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {props.availableSignatories.map((x) => {
                  const order = signers.findIndex((y) => y.signatoryId === x.id);
                  return (
                    <li key={x.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <input type="checkbox" checked={order >= 0} disabled={order < 0 && signers.length >= 4} onChange={() => toggleSigner(x.id)} aria-label={`Sign with ${x.name}`} />
                      <span className="w-6 text-xs font-bold text-slate-500">{order >= 0 ? `#${order + 1}` : ""}</span>
                      <span className="font-medium text-slate-900">{x.name}</span>
                      <span className="text-slate-500">— {x.designation}</span>
                      <span className="text-xs text-slate-400">{x.scopeName}</span>
                      {order >= 0 && (
                        <Input
                          value={signers[order].title}
                          maxLength={60}
                          placeholder={`Printed as: ${x.designation}`}
                          aria-label={`Designation printed for ${x.name}`}
                          onChange={(e) => setSigners((prev) => prev.map((y, i) => (i === order ? { ...y, title: e.target.value } : y)))}
                          className="ml-auto h-8 w-56"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {signers.some((x) => !signerById.has(x.signatoryId)) && (
              <p className="text-xs text-amber-700">A previously assigned signatory is no longer active; saving removes it.</p>
            )}
          </div>
        </fieldset>
        {props.canManageSettings && (
          <Button
            size="sm"
            onClick={() => {
              setSigners((prev) => prev.filter((x) => signerById.has(x.signatoryId)));
              void saveSettings();
            }}
            disabled={savingSettings}
          >
            {savingSettings ? "Saving…" : "Save certificate settings"}
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Issue certificates</h3>
        {!opts.ok ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{opts.reason}</p>
        ) : props.candidates.length === 0 ? (
          <p className="text-sm text-slate-500">No registrations for this tournament.</p>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Template: <strong>{opts.template.name} v{opts.template.version}</strong>. Preview uses this player&apos;s real data and the next number; nothing is
              saved until you issue.
              {!completed && " Certificates can be issued once the tournament status is Completed."}
            </p>

            {props.canIssue && completed && eligible.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                <span className="self-center text-xs font-semibold text-slate-600">Set for {selectedRows.length} selected:</span>
                <select aria-label="Category for selected" value={bulk.category} onChange={(e) => setBulk({ ...bulk, category: e.target.value })} className={`${selectClass} w-40`}>
                  <option value="">Category…</option>
                  {opts.categoryOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <select aria-label="Event for selected" value={bulk.event} onChange={(e) => setBulk({ ...bulk, event: e.target.value })} className={`${selectClass} w-40`}>
                  <option value="">Event…</option>
                  {opts.eventOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
                <select aria-label="Position for selected" value={bulk.achievement} onChange={(e) => setBulk({ ...bulk, achievement: e.target.value })} className={`${selectClass} w-40`}>
                  <option value="">Position…</option>
                  {positions.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={applyBulk}>
                  Apply
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 pr-2 font-medium">
                      {props.canIssue && completed && eligible.length > 0 && (
                        <input
                          type="checkbox"
                          aria-label="Select all eligible"
                          checked={eligible.every((c) => selected[c.playerId])}
                          onChange={(e) => setSelected(Object.fromEntries(eligible.map((c) => [c.playerId, e.target.checked])))}
                        />
                      )}
                    </th>
                    <th className="pb-2 pr-3 font-medium">Player</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 pr-3 font-medium">Event</th>
                    <th className="pb-2 pr-3 font-medium">Position</th>
                    <th className="pb-2 font-medium">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {props.candidates.map((c) => {
                    const isEligible = ELIGIBLE.has(c.registrationStatus) && !c.certificate;
                    const editable = props.canIssue && isEligible;
                    const ch = choices[c.playerId];
                    const set = (patch: Partial<RowChoice>) => setChoices((prev) => ({ ...prev, [c.playerId]: { ...prev[c.playerId], ...patch } }));
                    return (
                      <tr key={c.playerId} className="border-b border-slate-100 align-top last:border-0">
                        <td className="py-2 pr-2">
                          {editable && completed && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${c.playerName}`}
                              checked={Boolean(selected[c.playerId])}
                              onChange={(e) => setSelected((prev) => ({ ...prev, [c.playerId]: e.target.checked }))}
                            />
                          )}
                        </td>
                        <td className="min-w-48 py-2 pr-3">
                          <p className="font-medium text-primary">{c.playerName}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {c.playerCode}
                            {c.registrationCategory ? ` · ${c.registrationCategory}` : ""}
                          </p>
                          {c.parentName ? (
                            <p className="text-xs text-slate-500">S/D of {c.parentName}</p>
                          ) : editable ? (
                            <Input
                              value={ch.parentName}
                              maxLength={120}
                              placeholder="Parent name (not on record)"
                              aria-label={`Parent name for ${c.playerName}`}
                              onChange={(e) => set({ parentName: e.target.value })}
                              className="mt-1 h-7 text-xs"
                            />
                          ) : null}
                        </td>
                        {editable ? (
                          <>
                            <td className="min-w-32 py-2 pr-3">
                              <select aria-label={`Category for ${c.playerName}`} value={ch.category} onChange={(e) => set({ category: e.target.value })} className={selectClass}>
                                <option value="">—</option>
                                {opts.categoryOptions.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            </td>
                            <td className="min-w-32 py-2 pr-3">
                              <select aria-label={`Event for ${c.playerName}`} value={ch.event} onChange={(e) => set({ event: e.target.value })} className={selectClass}>
                                <option value="">—</option>
                                {opts.eventOptions.map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            </td>
                            <td className="min-w-36 py-2 pr-3">
                              <select aria-label={`Position for ${c.playerName}`} value={ch.achievement} onChange={(e) => set({ achievement: e.target.value })} className={selectClass}>
                                {positions.map((p) => (
                                  <option key={p.code} value={p.code}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </>
                        ) : (
                          <td colSpan={3} className="py-2 pr-3 text-xs text-slate-500">
                            {c.certificate ? c.certificate.position ?? "" : `Not eligible (${c.registrationStatus})`}
                          </td>
                        )}
                        <td className="whitespace-nowrap py-2">
                          {c.certificate ? (
                            <a href={c.certificate.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline">
                              {c.certificate.number}
                              {c.certificate.isRevoked ? " (revoked)" : ""}
                            </a>
                          ) : editable ? (
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => preview(c)}>
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {props.canIssue && completed && eligible.length > 0 && (
              <Button size="sm" onClick={issue} disabled={Boolean(issuing) || selectedRows.length === 0}>
                {issuing ? `Issuing… ${issuing.done}/${issuing.total}` : `Issue ${selectedRows.length || ""} certificate(s)`}
              </Button>
            )}

            {report && (
              <div className="space-y-2 rounded-md border border-slate-200 p-3 text-sm" data-testid="issue-report">
                <p className="font-semibold text-slate-800">
                  Issued {report.issued.length} · Not issued {report.failed.length}
                </p>
                {report.issued.length > 0 && (
                  <ul className="max-h-48 space-y-0.5 overflow-y-auto text-xs">
                    {report.issued.map((r) => (
                      <li key={r.certificateNumber} className="text-emerald-700">
                        ✓ <span className="font-mono">{r.certificateNumber}</span> — {r.playerName}
                        {!r.pdfStored && <span className="text-slate-500"> (PDF is generated on first download)</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {report.failed.length > 0 && (
                  <ul className="max-h-48 space-y-0.5 overflow-y-auto text-xs">
                    {report.failed.map((r) => (
                      <li key={r.playerId} className="text-red-700">
                        ✗ {r.playerName ?? r.playerId}: {r.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
