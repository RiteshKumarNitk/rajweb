"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export interface DistrictRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  president: string | null;
  secretary: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

function EditDistrictModal({
  district,
  onClose,
}: {
  district: DistrictRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [president, setPresident] = useState(district.president ?? "");
  const [secretary, setSecretary] = useState(district.secretary ?? "");
  const [email, setEmail] = useState(district.email ?? "");
  const [phone, setPhone] = useState(district.phone ?? "");
  const [address, setAddress] = useState(district.address ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/districts/${district.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          president: president.trim() || null,
          secretary: secretary.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "District updated");
      onClose();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update district");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-primary">Edit District</h2>
            <p className="text-xs text-slate-500">
              {district.name} — district name and slug cannot be changed
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="president">President</Label>
              <Input
                id="president"
                value={president}
                maxLength={100}
                onChange={(e) => setPresident(e.target.value)}
                placeholder="Pending Appointment"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secretary">Secretary</Label>
              <Input
                id="secretary"
                value={secretary}
                maxLength={100}
                onChange={(e) => setSecretary(e.target.value)}
                placeholder="Pending Appointment"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Contact email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              maxLength={254}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="district@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Contact phone</Label>
            <Input
              id="phone"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Office address</Label>
            <Input
              id="address"
              value={address}
              maxLength={300}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="District office address"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DistrictCardActions({ district }: { district: DistrictRow }) {
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
      toast.success(
        message ?? (district.isActive ? "District deactivated" : "District activated")
      );
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
        <Button
          variant={district.isActive ? "outline" : "default"}
          size="sm"
          onClick={handleToggleActive}
          disabled={busy}
        >
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

      {editOpen && <EditDistrictModal district={district} onClose={() => setEditOpen(false)} />}
    </>
  );
}
