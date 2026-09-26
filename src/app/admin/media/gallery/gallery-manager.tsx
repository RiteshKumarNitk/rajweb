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

export interface GalleryRow {
  id: string;
  title: string;
  category: string | null;
  imageUrl: string | null;
  driveUrl: string | null;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string;
}

const CATEGORIES = [
  "Tournament",
  "Events",
  "Action",
  "Training",
  "Team",
  "Facilities",
  "Leadership",
] as const;

function GalleryFormModal({
  item,
  onClose,
}: {
  item: GalleryRow | null; // null = create
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? "Tournament");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [driveUrl, setDriveUrl] = useState(item?.driveUrl ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [isPublished, setIsPublished] = useState(item?.isPublished ?? false);

  const setDriveUrlSafe = (value: string) => setDriveUrl(value);

  async function handleSave() {
    if (!title.trim() || !imageUrl.trim()) {
      toast.error("Title and image URL are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category: category.trim(),
        imageUrl: imageUrl.trim(),
        description: description.trim() || null,
        driveUrl: driveUrl.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isPublished,
      };
      const res = item
        ? await apiFetch(`/api/admin/gallery/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/admin/gallery", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save gallery item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">
            {item ? "Edit Gallery Item" : "Add Gallery Item"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-title">Title *</Label>
            <Input id="g-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-category">Category *</Label>
              <select
                id="g-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-sort">Sort order</Label>
              <Input
                id="g-sort"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-image">Image URL or path *</Label>
            <Input
              id="g-image"
              value={imageUrl}
              maxLength={500}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/images/rra/photo.jpg or https://…"
            />
            <p className="text-[11px] text-slate-400">
              Existing site images live in /images/…; full external https URLs also work.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-drive">Google Drive URL (optional)</Label>
            <Input
              id="g-drive"
              value={driveUrl}
              maxLength={2048}
              onChange={(e) => setDriveUrlSafe(e.target.value)}
              placeholder="https://drive.google.com/…"
            />
            <p className="text-[11px] text-slate-400">
              Leave empty for no Drive link. Must be a drive.google.com sharing URL.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-desc">Description (optional)</Label>
            <Textarea
              id="g-desc"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Active (visible on the public gallery)
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GalleryManager({ items }: { items: GalleryRow[] }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GalleryRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleToggleActive(item: GalleryRow) {
    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/gallery/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update gallery item");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: GalleryRow) {
    const confirmed = window.confirm(`Delete gallery item "${item.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/gallery/${item.id}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete gallery item");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {items.length} item{items.length === 1 ? "" : "s"} · ordered by sort order on the public gallery
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Gallery Item
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Image</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Drive Link</th>
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
                  No gallery items yet. Add one to publish it on the public gallery.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- tiny admin thumbnail; next/image fill needs sized container
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-10 w-14 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-14 rounded bg-slate-100" />
                    )}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 font-medium text-slate-800">
                    <span className="line-clamp-2">{item.title}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.driveUrl
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.driveUrl ? "Drive Link Added" : "No Drive Link"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.isPublished ? "ACTIVE" : "EXPIRED"} label={item.isPublished ? "Active" : "Inactive"} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.sortOrder}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        disabled={busyId === item.id}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                        disabled={busyId === item.id}
                      >
                        {item.isPublished ? "Deactivate" : "Activate"}
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

      {formOpen && <GalleryFormModal item={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
