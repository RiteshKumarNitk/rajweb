"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export interface DistrictRow {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DistrictStateOption {
  id: string;
  name: string;
}

interface DistrictFormValues {
  name: string;
  stateId: string;
  president: string;
  secretary: string;
  email: string;
  phone: string;
  address: string;
  sortOrder: string;
}

const EMPTY_FORM: DistrictFormValues = {
  name: "",
  stateId: "",
  president: "",
  secretary: "",
  email: "",
  phone: "",
  address: "",
  sortOrder: "0",
};

interface DistrictApiRecord {
  id: string;
  name: string;
  stateId: string | null;
  president: string | null;
  secretary: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  sortOrder: number;
}

function toFormValues(d: DistrictApiRecord): DistrictFormValues {
  return {
    name: d.name,
    stateId: d.stateId ?? "",
    president: d.president ?? "",
    secretary: d.secretary ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    address: d.address ?? "",
    sortOrder: String(d.sortOrder),
  };
}

/**
 * Add/Edit district modal. In edit mode the current values are fetched from
 * the server when the modal opens (GET /api/admin/districts/:id) — never
 * taken from the list render — so the form always shows the selected
 * district's latest data. Rendered through a portal so no ancestor can clip it.
 */
function DistrictFormModal({
  districtId,
  states,
  canChooseState,
  onClose,
}: {
  districtId: string | null;
  states: DistrictStateOption[];
  canChooseState: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = districtId !== null;
  const [values, setValues] = useState<DistrictFormValues | null>(
    isEdit ? null : { ...EMPTY_FORM, stateId: states.length === 1 ? states[0].id : "" }
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!districtId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/admin/districts/${districtId}`);
        const { data } = await handleApiFetch<DistrictApiRecord>(res);
        if (!cancelled) setValues(toFormValues(data));
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load district");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [districtId]);

  function set<K extends keyof DistrictFormValues>(key: K, value: string) {
    setValues((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!values) return;
    if (values.name.trim().length < 2) {
      toast.error("District name must be at least 2 characters");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: values.name.trim(),
        ...(canChooseState && values.stateId ? { stateId: values.stateId } : {}),
        president: values.president.trim() || null,
        secretary: values.secretary.trim() || null,
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
        sortOrder: Math.max(0, Math.trunc(Number(values.sortOrder) || 0)),
      };
      const res = await apiFetch(isEdit ? `/api/admin/districts/${districtId}` : "/api/admin/districts", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? (isEdit ? "District updated" : "District created"));
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save district");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof DistrictFormValues, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`district-${key}`}>{label}</Label>
      <Input
        id={`district-${key}`}
        value={values?.[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        disabled={!values || saving}
        {...props}
      />
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-primary">{isEdit ? "Edit District" : "Add District"}</h2>
            <p className="text-xs text-slate-500">
              {isEdit ? values?.name ?? "Loading…" : "Create a district under a state"}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {loadError ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
          ) : !values ? (
            <p className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading district…
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("name", "District name", { maxLength: 100 })}
                <div className="space-y-1.5">
                  <Label htmlFor="district-stateId">State</Label>
                  <select
                    id="district-stateId"
                    value={values.stateId}
                    onChange={(e) => set("stateId", e.target.value)}
                    disabled={!canChooseState || saving}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100"
                  >
                    <option value="" disabled>
                      Select state
                    </option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("president", "President", { maxLength: 100, placeholder: "Pending Appointment" })}
                {field("secretary", "Secretary", { maxLength: 100, placeholder: "Pending Appointment" })}
              </div>
              {field("email", "Contact email", { type: "email", maxLength: 254 })}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("phone", "Contact phone", { maxLength: 20 })}
                {field("sortOrder", "Display order", { type: "number", min: 0 })}
              </div>
              {field("address", "Office address", { maxLength: 300 })}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !values}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create district"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AddDistrictButton({ states, canChooseState }: { states: DistrictStateOption[]; canChooseState: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="flex items-center gap-1.5">
        <Plus className="h-4 w-4" /> Add District
      </Button>
      {open && (
        <DistrictFormModal districtId={null} states={states} canChooseState={canChooseState} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function DistrictCardActions({
  district,
  states,
  canChooseState,
}: {
  district: DistrictRow;
  states: DistrictStateOption[];
  canChooseState: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleToggleActive() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/districts/${district.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !district.isActive }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? (district.isActive ? "District deactivated" : "District activated"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update district");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete district "${district.name}"? This is only possible while it has no linked users, players, coaches, memberships, tournaments, or requests.`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/districts/${district.id}`, { method: "DELETE" });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "District deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete district");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={busy}>
          Edit
        </Button>
        <Button variant={district.isActive ? "outline" : "default"} size="sm" onClick={handleToggleActive} disabled={busy}>
          {district.isActive ? "Deactivate" : "Activate"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50"
          onClick={handleDelete}
          disabled={busy}
        >
          Delete
        </Button>
      </div>

      {editOpen && (
        <DistrictFormModal
          key={district.id}
          districtId={district.id}
          states={states}
          canChooseState={canChooseState}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}
