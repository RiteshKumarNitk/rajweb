"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import type { CertificateTemplateConfig } from "@/services/certificates/templates/template-config";

interface AssetOption {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  url: string | null;
}

interface Props {
  template: { id: string; name: string; description: string | null; version: number; locked: boolean; tournamentCount: number; config: CertificateTemplateConfig } | null;
  defaultConfig: CertificateTemplateConfig;
  assets: AssetOption[];
  achievements: { code: string; label: string }[];
  dateFormats: { value: string; example: string }[];
  placeholders: Record<string, string>;
}

const selectClass = "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm";

const LABEL_FIELDS: [keyof CertificateTemplateConfig["labels"], string][] = [
  ["serialNumber", "Serial number label"],
  ["date", "Date label"],
  ["organizedBy", "Organized By label"],
  ["recognizedBy", "Recognized By label"],
  ["category", "Category label"],
  ["event", "Event label"],
  ["position", "Position badge"],
  ["venue", "Venue label"],
];

/** One image picker (or none). */
function AssetSelect({ value, onChange, assets, id }: { value: string | null; onChange: (v: string | null) => void; assets: AssetOption[]; id: string }) {
  return (
    <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={selectClass}>
      <option value="">— None —</option>
      {assets
        .filter((a) => a.isActive || a.id === value)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.category.toLowerCase()})
            {a.isActive ? "" : " — deactivated"}
          </option>
        ))}
    </select>
  );
}

/** Ordered list of images (up to `max`) with add / move / remove. */
function AssetList({ value, onChange, assets, max, label }: { value: string[]; onChange: (v: string[]) => void; assets: AssetOption[]; max: number; label: string }) {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <ul className="space-y-1">
        {value.map((id, i) => (
          <li key={`${id}-${i}`} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
            {byId.get(id)?.url && <img src={byId.get(id)!.url!} alt="" className="h-6 w-10 object-contain" />}
            <span className="flex-1 truncate">{byId.get(id)?.name ?? "(missing image)"}</span>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-slate-400 disabled:opacity-30">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="text-slate-400 disabled:opacity-30">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {value.length < max && (
        <select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])} className={selectClass} aria-label={`Add to ${label}`}>
          <option value="">+ Add image…</option>
          {assets
            .filter((a) => a.isActive)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

export function TemplateEditor(props: Props) {
  const router = useRouter();
  const [name, setName] = useState(props.template?.name ?? "");
  const [description, setDescription] = useState(props.template?.description ?? "");
  const [c, setC] = useState<CertificateTemplateConfig>(props.template?.config ?? props.defaultConfig);
  const [abbreviations, setAbbreviations] = useState(
    Object.entries((props.template?.config ?? props.defaultConfig).stateAbbreviations)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n")
  );
  const [moveTournaments, setMoveTournaments] = useState(true);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CertificateTemplateConfig>(key: K, value: CertificateTemplateConfig[K]) => setC((prev) => ({ ...prev, [key]: value }));

  function buildConfig(): CertificateTemplateConfig {
    const stateAbbreviations = Object.fromEntries(
      abbreviations
        .split("\n")
        .map((l) => l.split("=").map((x) => x.trim()))
        .filter((p) => p.length === 2 && p[0] && p[1])
    );
    return { ...c, stateAbbreviations };
  }

  async function save(mode: "update" | "new-version" | "create") {
    if (name.trim().length < 3) return toast.error("Template name is required");
    if (c.positions.length === 0) return toast.error("Choose at least one position");
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || null, config: buildConfig() };
      const res =
        mode === "create"
          ? await apiFetch("/api/admin/certificate-templates", { method: "POST", body: JSON.stringify(body) })
          : await apiFetch(`/api/admin/certificate-templates/${props.template!.id}`, {
              method: "PATCH",
              body: JSON.stringify({ action: mode, ...body, ...(mode === "new-version" ? { moveTournaments } : {}) }),
            });
      const { message, data } = await handleApiFetch<{ id: string }>(res);
      toast.success(message ?? "Saved");
      if (data.id !== props.template?.id) router.push(`/admin/certificates/templates/${data.id}`);
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name">Name</Label>
            <Input id="tpl-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="RRA Standard Tournament Certificate" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-heading">Heading</Label>
            <Input id="tpl-heading" value={c.headingText} maxLength={60} onChange={(e) => set("headingText", e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tpl-desc">Description (admins only)</Label>
            <Input id="tpl-desc" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logos &amp; images</CardTitle>
          <CardDescription className="text-xs">Add or upload images on the Templates page. The logo row is: left group · centre branding · right group.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <AssetList label="Left logos (up to 4)" value={c.logos.left} onChange={(v) => set("logos", { ...c.logos, left: v })} assets={props.assets} max={4} />
          <div className="space-y-1.5">
            <Label htmlFor="tpl-center">Centre branding</Label>
            <AssetSelect id="tpl-center" value={c.logos.center} onChange={(v) => set("logos", { ...c.logos, center: v })} assets={props.assets} />
          </div>
          <AssetList label="Right logos (up to 4)" value={c.logos.right} onChange={(v) => set("logos", { ...c.logos, right: v })} assets={props.assets} max={4} />
          <div className="space-y-1.5">
            <Label htmlFor="tpl-emblem">Emblem above the heading</Label>
            <AssetSelect id="tpl-emblem" value={c.emblemAssetId} onChange={(v) => set("emblemAssetId", v)} assets={props.assets} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-watermark">Background watermark</Label>
            <AssetSelect id="tpl-watermark" value={c.watermark.assetId} onChange={(v) => set("watermark", { ...c.watermark, assetId: v })} assets={props.assets} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-opacity">Watermark strength ({Math.round(c.watermark.opacity * 100)}%)</Label>
            <input
              id="tpl-opacity"
              type="range"
              min={0}
              max={0.6}
              step={0.01}
              value={c.watermark.opacity}
              onChange={(e) => set("watermark", { ...c.watermark, opacity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wording</CardTitle>
          <CardDescription className="text-xs">
            Placeholders print the certificate&apos;s data in the highlight colour. Wrap a part in [[ ]] to drop it when a value inside is empty.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-line1">Recipient line</Label>
            <Input id="tpl-line1" value={c.lines.recipient} maxLength={200} onChange={(e) => set("lines", { ...c.lines, recipient: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tpl-line2">District line</Label>
            <Input id="tpl-line2" value={c.lines.district} maxLength={200} onChange={(e) => set("lines", { ...c.lines, district: e.target.value })} />
          </div>
          <p className="text-xs text-slate-500">
            Available:{" "}
            {Object.entries(props.placeholders).map(([k, v]) => (
              <span key={k} className="mr-2 inline-block" title={v}>
                <code className="rounded bg-slate-100 px-1">{`{{${k}}}`}</code>
              </span>
            ))}
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            {LABEL_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`tpl-label-${key}`}>{label}</Label>
                <Input id={`tpl-label-${key}`} value={c.labels[key]} maxLength={30} onChange={(e) => set("labels", { ...c.labels, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-abbr">State short forms (State=Short, one per line)</Label>
              <Textarea id="tpl-abbr" rows={3} value={abbreviations} onChange={(e) => setAbbreviations(e.target.value)} placeholder="Rajasthan=Raj." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-date">Date format</Label>
              <select id="tpl-date" value={c.dateFormat} onChange={(e) => set("dateFormat", e.target.value as CertificateTemplateConfig["dateFormat"])} className={selectClass}>
                {props.dateFormats.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.example}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            {(
              [
                ["showCategoryRow", "Category row"],
                ["showEventRow", "Event row"],
                ["showQr", "Verification QR code"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input type="checkbox" checked={c[key]} onChange={(e) => set(key, e.target.checked)} /> {label}
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={c.frame.enabled} onChange={(e) => set("frame", { ...c.frame, enabled: e.target.checked })} /> Grey frame
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Positions printed in the POSITION row (in this order)</Label>
            <div className="flex flex-wrap gap-4 text-sm">
              {props.achievements.map((a) => (
                <label key={a.code} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.positions.includes(a.code)}
                    onChange={(e) =>
                      set(
                        "positions",
                        e.target.checked
                          ? props.achievements.map((x) => x.code).filter((code) => code === a.code || c.positions.includes(code))
                          : c.positions.filter((code) => code !== a.code)
                      )
                    }
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-signers">Signatures (max)</Label>
              <select id="tpl-signers" value={c.maxSignatories} onChange={(e) => set("maxSignatories", Number(e.target.value))} className={selectClass}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            {(
              [
                ["ink", "Text colour"],
                ["highlight", "Highlight colour"],
                ["tick", "Tick colour"],
                ["boxBorder", "Box border"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`tpl-color-${key}`}>{label}</Label>
                <input
                  id={`tpl-color-${key}`}
                  type="color"
                  value={c.colors[key]}
                  onChange={(e) => set("colors", { ...c.colors, [key]: e.target.value.toUpperCase() })}
                  className="h-10 w-full rounded border border-slate-300"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {!props.template && (
          <Button onClick={() => save("create")} disabled={saving}>
            {saving ? "Saving…" : "Create template"}
          </Button>
        )}
        {props.template && !props.template.locked && (
          <Button onClick={() => save("update")} disabled={saving}>
            {saving ? "Saving…" : `Save v${props.template.version}`}
          </Button>
        )}
        {props.template && (
          <>
            <Button variant={props.template.locked ? "default" : "outline"} onClick={() => save("new-version")} disabled={saving}>
              Save as new version (v{props.template.version + 1}+)
            </Button>
            {props.template.tournamentCount > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={moveTournaments} onChange={(e) => setMoveTournaments(e.target.checked)} />
                Switch the {props.template.tournamentCount} tournament(s) using v{props.template.version} to the new version
              </label>
            )}
            <Button variant="outline" asChild>
              <a href={`/api/admin/certificate-templates/${props.template.id}/preview`} target="_blank" rel="noopener noreferrer">
                Preview saved version
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
