"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

export interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  youtubeVideoId: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

function VideoFormModal({
  item,
  onClose,
}: {
  item: VideoRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(item?.youtubeUrl ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  async function handleSave() {
    if (!title.trim() || !youtubeUrl.trim()) {
      toast.error("Title and YouTube URL are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        category: category.trim() || null,
        description: description.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      };
      const res = item
        ? await apiFetch(`/api/admin/media/videos/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch("/api/admin/media/videos", { method: "POST", body: JSON.stringify(payload) });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save video");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{item ? "Edit Video" : "Add Video"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="v-title">Title *</Label>
            <Input id="v-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-url">YouTube URL *</Label>
            <Input
              id="v-url"
              value={youtubeUrl}
              maxLength={500}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or https://youtu.be/…"
            />
            <p className="text-[11px] text-slate-400">
              watch, youtu.be, shorts, and embed links are accepted. The video ID is validated server-side.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="v-category">Category (optional)</Label>
              <Input id="v-category" value={category} maxLength={60} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-sort">Sort order</Label>
              <Input id="v-sort" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-desc">Description (optional)</Label>
            <Textarea id="v-desc" value={description} maxLength={2000} rows={3} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible on the public videos page)
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

export function VideoManager({ items, canManage }: { items: VideoRow[]; canManage: boolean }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VideoRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You have view-only access to media. Managing videos requires the <strong>videos:manage</strong> permission —
        ask a Super Admin to grant it to your role.
      </div>
    );
  }

  async function handleToggleActive(item: VideoRow) {
    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/media/videos/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update video");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: VideoRow) {
    if (!window.confirm(`Delete video "${item.title}"?`)) return;
    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/media/videos/${item.id}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete video");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Videos</h1>
          <p className="text-sm text-slate-500">
            YouTube videos shown on the public Media → Videos page.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Video
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Thumbnail</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">YouTube ID</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                  No videos yet. Add a YouTube link to publish it publicly.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail from YouTube CDN */}
                    <img
                      src={`https://i.ytimg.com/vi/${item.youtubeVideoId}/default.jpg`}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
                    />
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-medium text-slate-800">
                    <span className="line-clamp-2">{item.title}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.category ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.youtubeVideoId}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={item.isActive ? "ACTIVE" : "EXPIRED"}
                      label={item.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(item); setFormOpen(true); }} disabled={busyId === item.id}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(item)} disabled={busyId === item.id}>
                        {item.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item)}
                        disabled={busyId === item.id}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen && <VideoFormModal item={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
