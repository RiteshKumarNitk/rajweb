"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilLine, User, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { ProfileForm, type ProfileInitialValues } from "./profile-form";

const GENDERS: Record<string, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };

function formatDob(value: string | undefined): string {
  if (!value) return "Not provided";
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value || "Not provided"}</dd>
    </div>
  );
}

/**
 * My Profile: read-only by default. "Edit Profile" opens the existing form,
 * prefilled; Save stores and returns to this view, Cancel just returns.
 * With an approved registration, the address is changed through an Address
 * Update request (it is part of the approved record).
 */
export function ProfileDetails({
  initial,
  home,
  addressRequestHref,
}: {
  initial: ProfileInitialValues;
  home: { stateName: string | null; districtName: string | null };
  /** Set when the address is locked behind the request workflow. */
  addressRequestHref: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Edit Profile</CardTitle>
          <CardDescription>Ensure your legal full name and address match your official government ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={initial}
            addressLocked={Boolean(addressRequestHref)}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl" data-testid="profile-details">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Personal & Address Details</CardTitle>
          <CardDescription>What the association has on file for your account.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setEditing(true)}>
          <PencilLine className="h-4 w-4" /> Edit Profile
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-primary">
            <User className="h-4 w-4 text-accent" /> Personal Information
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Name" value={initial.name} />
            <Row label="Email" value={initial.email} />
            <Row label="Mobile" value={initial.phone} />
            <Row label="Date of Birth" value={formatDob(initial.dateOfBirth)} />
            <Row label="Gender" value={initial.gender ? GENDERS[initial.gender] : ""} />
          </dl>
        </section>
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2 text-sm font-bold text-primary">
            <MapPin className="h-4 w-4 text-accent" /> Address
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="State (registration)" value={home.stateName} />
            <Row label="District (registration)" value={home.districtName} />
            <Row label="Address" value={initial.address} />
            <Row label="City / Town" value={initial.city} />
            <Row label="State" value={initial.state} />
            <Row label="PIN Code" value={initial.pincode} />
          </dl>
          {addressRequestHref && (
            <p className="text-xs text-slate-500">
              Your address is part of your approved registration —{" "}
              <Link href={addressRequestHref} className="font-semibold text-secondary hover:underline">
                request an address change
              </Link>
              .
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
