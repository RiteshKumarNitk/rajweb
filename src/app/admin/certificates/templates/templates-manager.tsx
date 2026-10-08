"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil, Copy, Power, Star, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  version: number;
  layout: string;
  status: "ACTIVE" | "INACTIVE";
  isDefault: boolean;
  tournamentCount: number;
  certificateCount: number;
  isLatestVersion: boolean;
  updatedAt: string;
}

export interface AssetRow {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  url: string | null;
  source: string;
}

export function TemplatesManager({
  canManage,
  templates,
  assets,
  assetCategories,
}: {
  canManage: boolean;
  templates: TemplateRow[];
  assets: AssetRow[];
  assetCategories: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ name: string; category: string; file: File | null; path: string }>({ name: "", category: "LOGO", file: null, path: "" });

  async function act(id: string, body: { action: string; name?: string }) {
    setBusy(id);
    try {
      const res = await apiFetch(`/api/admin/certificate-templates/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      const { message, data } = await handleApiFetch<{ id: string }>(res);
      toast.success(message ?? "Saved");
      if (body.action === "duplicate") router.push(`/admin/certificates/templates/${data.id}`);
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function addAsset() {
    if (upload.name.trim().length < 2) return toast.error("Give the image a name");
    setBusy("asset");
    try {
      let res: Response;
      if (upload.file) {
        const form = new FormData();
        form.set("file", upload.file);
        form.set("name", upload.name.trim());
        form.set("category", upload.category);
        res = await apiFetch("/api/admin/certificate-assets", { method: "POST", body: form });
      } else {
        res = await apiFetch("/api/admin/certificate-assets", {
          method: "POST",
          body: JSON.stringify({ name: upload.name.trim(), category: upload.category, imagePath: upload.path.trim() }),
        });
      }
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Added");
      setUpload({ name: "", category: "LOGO", file: null, path: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAsset(a: AssetRow) {
    setBusy(a.id);
    try {
      const res = await apiFetch(`/api/admin/certificate-assets/${a.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !a.isActive }) });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link href="/admin/certificates/templates/new">New template</Link>
          </Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {templates.length === 0 && <p className="text-sm text-slate-500">No templates yet. Run the database seed to install the RRA Standard template.</p>}
        {templates.map((t) => (
          <Card key={t.id} className={t.status === "ACTIVE" ? "" : "opacity-70"}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription className="text-xs">
                    Version {t.version}
                    {!t.isLatestVersion && " (older version)"} · layout {t.layout}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {t.status === "ACTIVE" ? "Active" : "Inactive"}
                  </span>
                  {t.isDefault && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Default</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {t.description && <p className="text-sm text-slate-600">{t.description}</p>}
              <p className="text-xs text-slate-500">
                Used by {t.tournamentCount} tournament{t.tournamentCount === 1 ? "" : "s"} · {t.certificateCount} certificate{t.certificateCount === 1 ? "" : "s"} issued
                {t.certificateCount > 0 && " · locked"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`/api/admin/certificate-templates/${t.id}/preview`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </a>
                </Button>
                {canManage && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/certificates/templates/${t.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> {t.certificateCount > 0 ? "New version" : "Edit"}
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === t.id}
                      onClick={() => {
                        const name = window.prompt("Name of the copy", `${t.name} (copy)`);
                        if (name && name.trim().length >= 3) void act(t.id, { action: "duplicate", name: name.trim() });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Duplicate
                    </Button>
                    {!t.isDefault && t.status === "ACTIVE" && (
                      <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => act(t.id, { action: "set-default" })}>
                        <Star className="h-3.5 w-3.5" /> Make default
                      </Button>
                    )}
                    {!t.isDefault && (
                      <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => act(t.id, { action: t.status === "ACTIVE" ? "deactivate" : "activate" })}>
                        <Power className="h-3.5 w-3.5" /> {t.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificate images</CardTitle>
            <CardDescription className="text-xs">
              Logos, branding, emblem and watermark images that templates can use. Uploads are stored with the site&apos;s media files (PNG or JPEG;
              transparent PNG works best). Images are never deleted — issued certificates keep the image they were issued with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {assets.map((a) => (
                <div key={a.id} className={`space-y-1.5 rounded-lg border border-slate-200 p-2 ${a.isActive ? "" : "opacity-50"}`}>
                  <div className="flex h-20 items-center justify-center rounded bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of a certificate image */}
                    {a.url && <img src={a.url} alt={a.name} className="max-h-16 max-w-full object-contain" />}
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-800" title={a.name}>
                    {a.name}
                  </p>
                  <p className="text-[10px] uppercase text-slate-400">
                    {a.category} · {a.source}
                  </p>
                  <button type="button" disabled={busy === a.id} onClick={() => toggleAsset(a)} className="text-[11px] font-semibold text-primary hover:underline">
                    {a.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
            <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="asset-name">Name</Label>
                <Input id="asset-name" value={upload.name} maxLength={100} onChange={(e) => setUpload({ ...upload, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-category">Kind</Label>
                <select
                  id="asset-category"
                  value={upload.category}
                  onChange={(e) => setUpload({ ...upload, category: e.target.value })}
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  {assetCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-file">Upload image</Label>
                <Input id="asset-file" type="file" accept="image/png,image/jpeg" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] ?? null })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-path">…or site path</Label>
                <Input
                  id="asset-path"
                  value={upload.path}
                  placeholder="/images/certificates/logo.png"
                  disabled={Boolean(upload.file)}
                  onChange={(e) => setUpload({ ...upload, path: e.target.value })}
                />
              </div>
              <div className="sm:col-span-4">
                <Button size="sm" onClick={addAsset} disabled={busy === "asset" || (!upload.file && !upload.path.trim())}>
                  <Upload className="h-3.5 w-3.5" /> Add image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
