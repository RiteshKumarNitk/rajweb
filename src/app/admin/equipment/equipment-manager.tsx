"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { formatInrHelper } from "@/lib/format";

export interface EquipmentRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  sortOrder: number;
  image: string | null;
  shortDescription: string | null;
  description: string | null;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "RACQUETS", label: "Racquets" },
  { value: "BALLS", label: "Balls" },
  { value: "GRIPS", label: "Grips" },
  { value: "BAGS", label: "Bags" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "TRAINING", label: "Training Equipment" },
  { value: "OTHER", label: "Other" },
] as const;

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function EquipmentFormModal({
  item,
  onClose,
}: {
  item: EquipmentRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "OTHER");
  const [price, setPrice] = useState(String(item?.price ?? ""));
  const [stockQuantity, setStockQuantity] = useState(String(item?.stockQuantity ?? "0"));
  const [image, setImage] = useState(item?.image ?? "");
  const [shortDescription, setShortDescription] = useState(item?.shortDescription ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    const priceNum = Number(price);
    if (!Number.isInteger(priceNum) || priceNum < 0) {
      toast.error("Price must be a whole number of rupees (0 or more)");
      return;
    }
    const stockNum = Number(stockQuantity);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      toast.error("Stock quantity must be a whole number (0 or more)");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        price: priceNum,
        stockQuantity: stockNum,
        image: image.trim() || null,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      };
      const res = item
        ? await apiFetch(`/api/admin/equipment/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await apiFetch("/api/admin/equipment", { method: "POST", body: JSON.stringify(payload) });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save equipment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{item ? "Edit Equipment" : "Add Equipment"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Name *</Label>
            <Input id="e-name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-category">Category</Label>
              <select
                id="e-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-sort">Sort order</Label>
              <Input id="e-sort" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-price">Price (₹, whole rupees) *</Label>
              <Input id="e-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-stock">Stock quantity</Label>
              <Input id="e-stock" type="number" min={0} value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-image">Image URL or path</Label>
            <Input
              id="e-image"
              value={image}
              maxLength={500}
              onChange={(e) => setImage(e.target.value)}
              placeholder="/images/equipment/racquet.jpg or https://…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-short">Short description</Label>
            <Input id="e-short" value={shortDescription} maxLength={300} onChange={(e) => setShortDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="e-desc">Full description</Label>
            <Textarea id="e-desc" value={description} maxLength={5000} rows={4} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active (visible in the public shop)
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

export function EquipmentManager({
  items,
  canManage,
}: {
  items: EquipmentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const matchesStatus =
          statusFilter === "ALL" || (statusFilter === "ACTIVE" ? i.isActive : !i.isActive);
        if (!matchesStatus) return false;
        if (!search.trim()) return true;
        return (
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase())
        );
      }),
    [items, search, statusFilter]
  );

  if (!canManage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        You have view-only access. Equipment management requires the <strong>equipment:manage</strong> permission.
      </div>
    );
  }

  async function handleToggleActive(item: EquipmentRow) {
    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/equipment/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: EquipmentRow) {
    if (!window.confirm(`Delete "${item.name}"? Items with existing orders will be deactivated instead.`)) return;
    setBusyId(item.id);
    try {
      const res = await apiFetch(`/api/admin/equipment/${item.id}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Equipment Catalog</h1>
          <p className="text-sm text-slate-500">Products available in the public equipment shop.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Equipment
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Image</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                  {items.length === 0 ? "No equipment yet. Add the first product." : "No records match the filters."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                      <img src={item.image} alt="" className="h-10 w-14 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-14 rounded bg-slate-100" />
                    )}
                  </td>
                  <td className="max-w-[200px] px-4 py-3 font-medium text-slate-800">
                    <span className="line-clamp-2">{item.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{categoryLabel(item.category)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatInrHelper(item.price)}</td>
                  <td className="px-4 py-3">
                    <span className={item.stockQuantity < 1 ? "text-red-600" : "text-slate-600"}>
                      {item.stockQuantity}
                    </span>
                  </td>
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

      {formOpen && <EquipmentFormModal item={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
