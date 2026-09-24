"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Ban, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatInr } from "@/modules/account/membership-pricing";

export interface CategoryRow {
  id: string;
  name: string;
  type: "SINGLES" | "DOUBLES";
  fee: number;
  isActive: boolean;
}

export function CategoriesManager({
  tournamentId,
  categories,
  readOnly,
}: {
  tournamentId: string;
  categories: CategoryRow[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"SINGLES" | "DOUBLES">("SINGLES");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setAdding(false);
    setEditingId(null);
    setName("");
    setType("SINGLES");
    setFee("");
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setAdding(false);
    setName(c.name);
    setType(c.type);
    setFee(String(c.fee));
  }

  async function handleSave() {
    if (!name.trim() || fee === "" || Number(fee) < 0) {
      toast.error("Enter a category name and a valid fee");
      return;
    }
    setBusy(true);
    try {
      const payload = { name: name.trim(), type, fee: Number(fee) };
      const res = editingId
        ? await apiFetch(`/api/admin/tournaments/${tournamentId}/categories/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/api/admin/tournaments/${tournamentId}/categories`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(c: CategoryRow) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/tournaments/${tournamentId}/categories/${c.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(c: CategoryRow) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/tournaments/${tournamentId}/categories/${c.id}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove category");
    } finally {
      setBusy(false);
    }
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="space-y-4">
      {categories.length === 0 && !showForm ? (
        <EmptyState title="No registration categories configured yet" description="Add Singles or Doubles pricing for this tournament." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-2 pr-4 font-semibold text-slate-600">Category</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600">Type</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600">Fee</th>
                <th className="pb-2 pr-4 font-semibold text-slate-600">Active</th>
                {!readOnly && <th className="pb-2 font-semibold text-slate-600">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-primary">{c.name}</td>
                  <td className="py-2 pr-4">{c.type === "SINGLES" ? "Singles" : "Doubles"}</td>
                  <td className="py-2 pr-4">{formatInr(c.fee)}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {c.isActive ? "Yes" : "No"}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="py-2">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => startEdit(c)} disabled={busy} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleToggleActive(c)} disabled={busy} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={c.isActive ? "Disable" : "Enable"}>
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRemove(c)} disabled={busy} className="rounded p-1.5 text-secondary hover:bg-red-50" aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!readOnly && (
        showForm ? (
          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-semibold text-primary">{editingId ? "Edit Category" : "New Category"}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Junior Singles" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="cat-type">Type</Label>
                <select
                  id="cat-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "SINGLES" | "DOUBLES")}
                  className="mt-1.5 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="SINGLES">Singles</option>
                  <option value="DOUBLES">Doubles</option>
                </select>
              </div>
              <div>
                <Label htmlFor="cat-fee">Fee (₹)</Label>
                <Input id="cat-fee" type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1.5" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={resetForm} disabled={busy}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )
      )}
    </div>
  );
}
