"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardList, Loader2, Paperclip, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatInrHelper } from "@/lib/format";
import { formatDate, cn } from "@/lib/utils";

export interface RequirementRow {
  id: string;
  requirementNumber: string;
  itemName: string;
  category: string;
  description: string | null;
  quantity: number;
  estimatedUnitPrice: number | null;
  priority: string;
  notes: string | null;
  requiredBy: string | null;
  attachmentId: string | null;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  districtName: string;
  stateName: string;
  requestedBy: string;
  createdAt: string;
  nextStatuses: string[];
}

const CATEGORIES = [
  ["RACQUETS", "Racquets"],
  ["BALLS", "Balls"],
  ["GRIPS", "Grips"],
  ["BAGS", "Bags"],
  ["ACCESSORIES", "Accessories"],
  ["TRAINING", "Training Equipment"],
  ["OTHER", "Other"],
] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  UNDER_REVIEW: "bg-blue-50 text-blue-800 border-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  FULFILLED: "bg-slate-100 text-slate-700 border-slate-200",
};
const PRIORITY_STYLES: Record<string, string> = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-700",
  HIGH: "text-amber-700",
  URGENT: "text-red-700 font-bold",
};
const MOVE_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Start review",
  APPROVED: "Approve",
  REJECTED: "Reject",
  FULFILLED: "Mark fulfilled",
};

const label = (s: string) => s.replace("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm";

function RequirementForm({
  row,
  districts,
  districtLocked,
  onClose,
}: {
  row: RequirementRow | null;
  districts: { id: string; label: string }[];
  districtLocked: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [itemName, setItemName] = useState(row?.itemName ?? "");
  const [category, setCategory] = useState(row?.category ?? "OTHER");
  const [quantity, setQuantity] = useState(String(row?.quantity ?? 1));
  const [estimatedUnitPrice, setEstimatedUnitPrice] = useState(row?.estimatedUnitPrice != null ? String(row.estimatedUnitPrice) : "");
  const [priority, setPriority] = useState(row?.priority ?? "MEDIUM");
  const [requiredBy, setRequiredBy] = useState(row?.requiredBy ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [districtId, setDistrictId] = useState(districts.length === 1 ? districts[0].id : "");
  const [attachmentId, setAttachmentId] = useState(row?.attachmentId ?? null);
  const [attachmentName, setAttachmentName] = useState(row?.attachmentId ? "Current attachment" : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const qty = Number(quantity);
  const price = estimatedUnitPrice === "" ? null : Number(estimatedUnitPrice);
  const valid =
    itemName.trim().length >= 2 &&
    Number.isInteger(qty) && qty >= 1 &&
    (price === null || (Number.isInteger(price) && price >= 0)) &&
    (row || districtLocked || !!districtId);

  async function upload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("kind", "requirement-attachment");
      form.append("file", file);
      const { data } = await handleApiFetch<{ id: string }>(await apiFetch("/api/admin/media", { method: "POST", body: form }));
      setAttachmentId(data.id);
      setAttachmentName(file.name);
      toast.success("Attachment uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        itemName: itemName.trim(),
        category,
        quantity: qty,
        estimatedUnitPrice: price,
        priority,
        requiredBy: requiredBy || null,
        description: description.trim() || null,
        notes: notes.trim() || null,
        attachmentId,
        ...(!row && !districtLocked ? { districtId } : {}),
      };
      const res = row
        ? await apiFetch(`/api/admin/equipment/requirements/${row.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch("/api/admin/equipment/requirements", { method: "POST", body: JSON.stringify(payload) });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the requirement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <Card className="max-h-[92vh] w-full max-w-lg overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{row ? `Edit ${row.requirementNumber}` : "New equipment requirement"}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {!row && !districtLocked && (
            <div className="space-y-1.5">
              <Label htmlFor="r-district">District *</Label>
              <select id="r-district" className={selectClass} value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
                <option value="">Select district</option>
                {districts.map((d) => (<option key={d.id} value={d.id}>{d.label}</option>))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="r-item">Equipment name *</Label>
            <Input id="r-item" value={itemName} maxLength={160} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Training racquets" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="r-category">Category</Label>
              <select id="r-category" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-priority">Priority</Label>
              <select id="r-priority" className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (<option key={p} value={p}>{label(p)}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-qty">Required quantity *</Label>
              <Input id="r-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-price">Estimated unit price (₹)</Label>
              <Input id="r-price" type="number" min={0} value={estimatedUnitPrice} onChange={(e) => setEstimatedUnitPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-date">Required by</Label>
              <Input id="r-date" type="date" value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea id="r-desc" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is needed and why" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-notes">Notes</Label>
            <Textarea id="r-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Attachment (optional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading…" : "Upload image or PDF"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {attachmentId && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                  <Paperclip className="h-3.5 w-3.5" /> {attachmentName}
                  <button type="button" className="ml-1 text-red-600 hover:underline" onClick={() => { setAttachmentId(null); setAttachmentName(""); }}>remove</button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">PNG, JPEG, WebP or PDF, up to 4 MB.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!valid || saving}>{saving ? "Saving…" : row ? "Save changes" : "Submit requirement"}</Button>
        </div>
      </Card>
    </div>
  );
}

export function RequirementsManager({
  rows,
  canManage,
  canReview,
  districtLocked,
  districts,
}: {
  rows: RequirementRow[];
  canManage: boolean;
  canReview: boolean;
  districtLocked: boolean;
  districts: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RequirementRow | null>(null);
  const [review, setReview] = useState<{ row: RequirementRow; status: string } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [deleting, setDeleting] = useState<RequirementRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitReview() {
    if (!review) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/equipment/requirements/${review.row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: review.status, reviewNote }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Updated");
      setReview(null);
      setReviewNote("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the requirement");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const { message } = await handleApiFetch(await apiFetch(`/api/admin/equipment/requirements/${deleting.id}`, { method: "DELETE" }));
      toast.success(message ?? "Deleted");
      setDeleting(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the requirement");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> New requirement
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <Card>
          <EmptyState title="No requirements" description="Requirements raised by districts appear here." icon={<ClipboardList className="h-8 w-8" />} />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">{r.requirementNumber}</span>
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", STATUS_STYLES[r.status])}>{label(r.status)}</span>
                      <span className={cn("text-xs uppercase", PRIORITY_STYLES[r.priority])}>{r.priority}</span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">
                      {r.itemName} <span className="font-normal text-slate-500">× {r.quantity}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.districtName}, {r.stateName} · by {r.requestedBy} · {formatDate(r.createdAt)}
                      {r.requiredBy ? ` · needed by ${formatDate(r.requiredBy)}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {r.estimatedUnitPrice != null && (
                      <>
                        <p className="font-semibold text-slate-900">{formatInrHelper(r.estimatedUnitPrice * r.quantity)}</p>
                        <p className="text-xs text-slate-500">est. {formatInrHelper(r.estimatedUnitPrice)} each</p>
                      </>
                    )}
                  </div>
                </div>
                {(r.description || r.notes) && (
                  <div className="space-y-1 text-sm text-slate-700">
                    {r.description && <p className="whitespace-pre-line">{r.description}</p>}
                    {r.notes && <p className="whitespace-pre-line text-xs text-slate-500">Notes: {r.notes}</p>}
                  </div>
                )}
                {r.reviewNote && (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Review{r.reviewedBy ? ` by ${r.reviewedBy}` : ""}{r.reviewedAt ? ` (${formatDate(r.reviewedAt)})` : ""}: {r.reviewNote}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {r.attachmentId && (
                    <a href={`/api/media/${r.attachmentId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                      <Paperclip className="h-3.5 w-3.5" /> Attachment
                    </a>
                  )}
                  <div className="ml-auto flex flex-wrap gap-2">
                    {canManage && r.status === "PENDING" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { setEditing(r); setFormOpen(true); }}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDeleting(r)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </>
                    )}
                    {canReview &&
                      r.nextStatuses.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === "REJECTED" ? "outline" : "default"}
                          className={s === "REJECTED" ? "border-red-200 text-red-600 hover:bg-red-50" : undefined}
                          onClick={() => { setReview({ row: r, status: s }); setReviewNote(""); }}
                        >
                          {MOVE_LABELS[s] ?? label(s)}
                        </Button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {formOpen && (
        <RequirementForm row={editing} districts={districts} districtLocked={districtLocked} onClose={() => setFormOpen(false)} />
      )}

      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">{MOVE_LABELS[review.status] ?? label(review.status)} — {review.row.requirementNumber}</p>
              <div className="space-y-1">
                <Label htmlFor="review-note">{review.status === "REJECTED" ? "Reason (required)" : "Note (optional)"}</Label>
                <Textarea id="review-note" rows={3} maxLength={1000} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReview(null)} disabled={busy}>Back</Button>
                <Button onClick={submitReview} disabled={busy || (review.status === "REJECTED" && !reviewNote.trim())}>
                  {busy ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-5">
              <p className="font-semibold text-slate-900">Delete {deleting.requirementNumber}?</p>
              <p className="text-sm text-slate-600">This pending requirement will be removed.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Keep</Button>
                <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
