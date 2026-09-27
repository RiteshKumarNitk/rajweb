"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export interface StateRow {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  sortOrder: number;
  districtCount: number;
  adminCount: number;
  tournamentCount: number;
}

function StateFormModal({ state, onClose }: { state: StateRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(state?.name ?? "");
  const [code, setCode] = useState(state?.code ?? "");
  const [sortOrder, setSortOrder] = useState(String(state?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(state ? `/api/admin/states/${state.id}` : "/api/admin/states", {
        method: state ? "PATCH" : "POST",
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          sortOrder: Math.max(0, Math.trunc(Number(sortOrder) || 0)),
        }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save state");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{state ? "Edit State" : "Add State"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="state-name">State name</Label>
            <Input id="state-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="state-code">Code (optional)</Label>
              <Input id="state-code" value={code} maxLength={10} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state-order">Display order</Label>
              <Input id="state-order" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || name.trim().length < 2}>
            {saving ? "Saving…" : state ? "Save changes" : "Create state"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function StatesManager({
  states,
  canManage,
  unassignedDistricts,
}: {
  states: StateRow[];
  canManage: boolean;
  unassignedDistricts: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<StateRow | null | "new">(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function mutate(state: StateRow, method: "PATCH" | "DELETE", body?: object) {
    if (method === "DELETE" && !window.confirm(`Delete state "${state.name}"? Only possible while it has no districts, administrators or tournaments.`)) {
      return;
    }
    setBusyId(state.id);
    try {
      const res = await apiFetch(`/api/admin/states/${state.id}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">States</h1>
          <p className="text-sm text-slate-500">
            Top level of the organisation: State → District → Players, Coaches and Members.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add State
          </Button>
        )}
      </div>

      {canManage && unassignedDistricts > 0 && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {unassignedDistricts} district{unassignedDistricts === 1 ? " is" : "s are"} not assigned to a state. Only
          Super Admins can see their records until they are assigned —{" "}
          <Link href="/admin/districts" className="font-semibold underline">
            open Districts
          </Link>{" "}
          and set the state on each.
        </div>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Districts</th>
                <th className="px-4 py-3">State admins</th>
                <th className="px-4 py-3">Tournaments</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {states.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No states yet.
                  </td>
                </tr>
              )}
              {states.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-slate-500">{s.sortOrder}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Link href={`/admin/districts?state=${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.code ?? "—"}</td>
                  <td className="px-4 py-3">{s.districtCount}</td>
                  <td className="px-4 py-3">{s.adminCount}</td>
                  <td className="px-4 py-3">{s.tournamentCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busyId === s.id} onClick={() => setEditing(s)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === s.id}
                          onClick={() => mutate(s, "PATCH", { isActive: !s.isActive })}
                        >
                          {s.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={busyId === s.id}
                          onClick={() => mutate(s, "DELETE")}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editing !== null && <StateFormModal state={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
