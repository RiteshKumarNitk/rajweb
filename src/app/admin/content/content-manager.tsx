"use client";

import { useState } from "react";
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

/* ── Field-driven form model ─────────────────────────────────── */

export type ContentFieldType = "text" | "textarea" | "number" | "checkbox" | "image" | "url";

export interface ContentFieldDef {
  name: string;
  label: string;
  type: ContentFieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  helpText?: string;
  defaultValue?: string | number | boolean;
  hideInTable?: boolean;
}

export interface ContentRecord {
  id: string;
  isActive: boolean;
  sortOrder?: number;
  order?: number;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ContentManagerProps {
  title: string;
  description: string;
  apiPath: string; // e.g. /api/admin/content/committee
  fields: ContentFieldDef[];
  records: ContentRecord[];
  /** Render a record's primary display cell (thumbnail/title). */
  renderPrimary?: (record: ContentRecord) => React.ReactNode;
  /** Column headers after Image/Title (category, order, etc.). */
  columns?: { key: string; label: string }[];
  /** Human-readable label, e.g. "committee member". */
  entityLabel: string;
  /** Record uses `order` instead of `sortOrder`. */
  usesOrderField?: boolean;
  /** Does the record support an image preview? */
  hasImage?: boolean;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ContentFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const commonProps = {
    id: `f-${field.name}`,
    maxLength: field.maxLength,
    placeholder: field.placeholder,
  };

  if (field.type === "textarea") {
    return (
      <Textarea
        {...commonProps}
        value={(value as string) ?? ""}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <Input
      {...commonProps}
      type={field.type === "number" ? "number" : "text"}
      value={(value as string | number) ?? ""}
      onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
    />
  );
}

function RecordFormModal({
  title,
  fields,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  fields: ContentFieldDef[];
  initial: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const v: Record<string, unknown> = {};
    for (const f of fields) {
      v[f.name] = initial?.[f.name] ?? f.defaultValue ?? (f.type === "checkbox" ? false : f.type === "number" ? 0 : "");
    }
    return v;
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const missing = fields.find(
      (f) => f.required && f.type !== "checkbox" && !String(values[f.name] ?? "").trim()
    );
    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {fields
            .filter((f) => f.type !== "checkbox")
            .map((f) => (
              <div key={f.name} className="space-y-1.5">
                {f.type !== "checkbox" && <Label htmlFor={`f-${f.name}`}>{f.label}{f.required ? " *" : ""}</Label>}
                <FieldInput field={f} value={values[f.name]} onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))} />
                {f.helpText && <p className="text-[11px] text-slate-400">{f.helpText}</p>}
              </div>
            ))}
          {fields
            .filter((f) => f.type === "checkbox")
            .map((f) => (
              <FieldInput key={f.name} field={f} value={values[f.name]} onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))} />
            ))}
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

export function ContentManager({
  title,
  description,
  apiPath,
  fields,
  records,
  renderPrimary,
  columns = [],
  entityLabel,
  usesOrderField = false,
  hasImage = false,
}: ContentManagerProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const orderKey = usesOrderField ? "order" : "sortOrder";

  const filtered = records.filter((r) => {
    const matchesStatus =
      statusFilter === "ALL" || (statusFilter === "ACTIVE" ? r.isActive : !r.isActive);
    if (!matchesStatus) return false;
    if (!search.trim()) return true;
    const haystack = [r.title, r.name, r.label, r.year, r.designation, String(r[orderKey] ?? "")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(record: ContentRecord) {
    setEditing(record);
    setFormOpen(true);
  }

  async function handleSave(values: Record<string, unknown>) {
    try {
      const res = editing
        ? await apiFetch(`${apiPath}/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) })
        : await apiFetch(apiPath, { method: "POST", body: JSON.stringify(values) });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      setFormOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
      throw err;
    }
  }

  async function handleToggleActive(record: ContentRecord) {
    setBusyId(record.id);
    try {
      const res = await apiFetch(`${apiPath}/${record.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !record.isActive }),
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

  async function handleDelete(record: ContentRecord) {
    const label =
      (record.title as string) ?? (record.name as string) ?? (record.label as string) ?? record.id;
    if (!window.confirm(`Delete this ${entityLabel} ("${label}")? This cannot be undone.`)) return;

    setBusyId(record.id);
    try {
      const res = await apiFetch(`${apiPath}/${record.id}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add {entityLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9"
          />
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
              {hasImage && <th className="px-4 py-3 font-semibold">Image</th>}
              <th className="px-4 py-3 font-semibold">Title</th>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">{c.label}</th>
              ))}
              <th className="px-4 py-3 font-semibold">Status</th>
              {fields.some((f) => f.name === orderKey) && (
                <th className="px-4 py-3 font-semibold">Order</th>
              )}
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6 + columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  {records.length === 0
                    ? `No ${entityLabel}s yet. Add one to publish it publicly.`
                    : "No records match the current filters."}
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 last:border-0">
                  {hasImage && (
                    <td className="px-4 py-3">
                      {(() => {
                        const src = (record.photo as string) ?? (record.logo as string) ?? "";
                        if (!src) return <div className="h-10 w-14 rounded bg-slate-100" />;
                        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail; next/image fill needs a sized container
                        return <img src={src} alt="" className="h-10 w-14 rounded object-cover" />;
                      })()}
                    </td>
                  )}
                  <td className="max-w-[240px] px-4 py-3 font-medium text-slate-800">
                    <span className="line-clamp-2">
                      {renderPrimary
                        ? renderPrimary(record)
                        : ((record.title as string) ?? (record.name as string) ?? (record.label as string) ?? "—")}
                    </span>
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-slate-600">
                      {String(record[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={record.isActive ? "ACTIVE" : "EXPIRED"}
                      label={record.isActive ? "Active" : "Inactive"}
                    />
                  </td>
                  {fields.some((f) => f.name === orderKey) && (
                    <td className="px-4 py-3 text-slate-600">{String(record[orderKey] ?? 0)}</td>
                  )}
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(record.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(record)} disabled={busyId === record.id}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(record)}
                        disabled={busyId === record.id}
                      >
                        {record.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(record)}
                        disabled={busyId === record.id}
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

      {formOpen && (
        <RecordFormModal
          title={editing ? `Edit ${entityLabel}` : `Add ${entityLabel}`}
          fields={fields}
          initial={editing ? (editing as unknown as Record<string, unknown>) : null}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
