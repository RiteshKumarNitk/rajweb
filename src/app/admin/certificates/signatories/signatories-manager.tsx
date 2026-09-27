"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { OwnerOptions, ownerValue, parseOwnerValue, type OwnerGroup } from "@/shared/components/admin/tournament-owner-options";

export interface SignatoryRow {
  id: string;
  name: string;
  designation: string;
  organization: string | null;
  signatureImageUrl: string | null;
  stateId: string | null;
  districtId: string | null;
  scopeName: string;
  isActive: boolean;
  sortOrder: number;
  tournamentCount: number;
}

interface Props {
  rows: SignatoryRow[];
  canManage: boolean;
  ownerGroups: OwnerGroup[];
  allowFederationLevel: boolean;
  lockedDistrictId?: string;
}

function SignatoryModal({
  row,
  ownerGroups,
  allowFederationLevel,
  lockedDistrictId,
  onClose,
}: Omit<Props, "rows" | "canManage"> & { row: SignatoryRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(row?.name ?? "");
  const [designation, setDesignation] = useState(row?.designation ?? "");
  const [organization, setOrganization] = useState(row?.organization ?? "");
  const [signatureImageUrl, setSignatureImageUrl] = useState(row?.signatureImageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(row?.sortOrder ?? 0));
  const [owner, setOwner] = useState(
    lockedDistrictId
      ? ownerValue({ stateId: null, districtId: lockedDistrictId })
      : row
        ? ownerValue(row)
        : allowFederationLevel
          ? ""
          : ownerGroups.length === 1
            ? ownerValue({ stateId: ownerGroups[0].stateId, districtId: null })
            : ""
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const parsed = parseOwnerValue(owner);
      const ownerFields = lockedDistrictId
        ? {}
        : parsed
          ? { stateId: parsed.stateId ?? null, districtId: parsed.districtId }
          : { stateId: null, districtId: null };
      const res = await apiFetch(row ? `/api/admin/signatories/${row.id}` : "/api/admin/signatories", {
        method: row ? "PATCH" : "POST",
        body: JSON.stringify({
          name: name.trim(),
          designation: designation.trim(),
          organization: organization.trim() || null,
          signatureImageUrl: signatureImageUrl.trim() || null,
          sortOrder: Math.max(0, Math.trunc(Number(sortOrder) || 0)),
          ...ownerFields,
        }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Saved");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save signatory");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-primary">{row ? "Edit Signatory" : "Add Signatory"}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sig-name">Name</Label>
              <Input id="sig-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-designation">Designation</Label>
              <Input id="sig-designation" value={designation} maxLength={100} placeholder="President" onChange={(e) => setDesignation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-org">Organization (optional)</Label>
            <Input id="sig-org" value={organization} maxLength={150} onChange={(e) => setOrganization(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sig-image">Signature image (optional)</Label>
            <Input
              id="sig-image"
              value={signatureImageUrl}
              maxLength={500}
              placeholder="/images/signatures/president.png or https://…"
              onChange={(e) => setSignatureImageUrl(e.target.value)}
            />
            <p className="text-xs text-slate-500">PNG or JPEG. A /images/… path is most reliable; https links that redirect are skipped.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sig-owner">Belongs to</Label>
              <select
                id="sig-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                disabled={Boolean(lockedDistrictId) || saving}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100"
              >
                {allowFederationLevel && <option value="">Federation level (all states)</option>}
                {!allowFederationLevel && !lockedDistrictId && owner === "" && (
                  <option value="" disabled>
                    Select state / district
                  </option>
                )}
                <OwnerOptions groups={ownerGroups} allowStateWide={!lockedDistrictId} />
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-order">Display order</Label>
              <Input id="sig-order" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || name.trim().length < 2 || designation.trim().length < 2}>
            {saving ? "Saving…" : row ? "Save changes" : "Add signatory"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function SignatoriesManager({ rows, canManage, ownerGroups, allowFederationLevel, lockedDistrictId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<SignatoryRow | null | "new">(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function mutate(row: SignatoryRow, method: "PATCH" | "DELETE", body?: object) {
    if (method === "DELETE" && !window.confirm(`Delete signatory "${row.name}"?`)) return;
    setBusy(row.id);
    try {
      const res = await apiFetch(`/api/admin/signatories/${row.id}`, { method, body: body ? JSON.stringify(body) : undefined });
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
    <>
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing("new")} className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Signatory
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Belongs to</th>
                <th className="px-4 py-3">Tournaments</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No signatories yet. Add the officials who sign certificates.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.designation}
                    {r.organization && <span className="block text-xs text-slate-500">{r.organization}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.scopeName}</td>
                  <td className="px-4 py-3">{r.tournamentCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => setEditing(r)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => mutate(r, "PATCH", { isActive: !r.isActive })}>
                          {r.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          disabled={busy === r.id}
                          onClick={() => mutate(r, "DELETE")}
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
      {editing !== null && (
        <SignatoryModal
          row={editing === "new" ? null : editing}
          ownerGroups={ownerGroups}
          allowFederationLevel={allowFederationLevel}
          lockedDistrictId={lockedDistrictId}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
