"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trophy, GraduationCap, Heart } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { StateDistrictSelect } from "@/shared/components/forms/state-district-select";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MEMBER_TYPES = [
  { value: "PLAYER", label: "Player", description: "Compete in tournaments and get a player ID.", icon: Trophy },
  { value: "COACH", label: "Coach", description: "Register your coaching credentials.", icon: GraduationCap },
  { value: "SUPPORTER", label: "Supporter / Parent", description: "Follow events and buy equipment.", icon: Heart },
] as const;

/** First validation message from an API error response, else its message. */
async function errorMessage(res: Response): Promise<string> {
  const json = await res.json().catch(() => null);
  const issue = Array.isArray(json?.error?.details) ? json.error.details[0]?.message : null;
  return issue || json?.error?.message || "Something went wrong — please try again.";
}

export function OnboardingForm({ defaultName, defaultPhone, email }: { defaultName: string; defaultPhone: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [memberType, setMemberType] = useState<string>("");
  const [location, setLocation] = useState({ stateId: "", districtId: "" });
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const phoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const pincodeValid = !pincode || /^\d{6}$/.test(pincode.trim());
  const canSubmit = name.trim().length >= 2 && phoneValid && pincodeValid && !!memberType && !!location.stateId && !!location.districtId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost("/api/account/onboarding", {
        name: name.trim(),
        phone: phone.trim(),
        memberType,
        stateId: location.stateId,
        districtId: location.districtId,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      });
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      const json = await res.json();
      toast.success(`Welcome! You are registered under ${json.data.districtName}, ${json.data.stateName}.`);
      router.push(json.data.next ?? "/account/dashboard");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ob-name">Full name</Label>
            <Input id="ob-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-phone">Mobile number</Label>
            <Input id="ob-phone" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="10-digit mobile" autoComplete="tel-national" />
            {phone && !phoneValid && <p className="text-xs text-red-600">Enter a valid 10-digit mobile number.</p>}
          </div>
        </div>
        <p className="text-xs text-slate-500">Signed in as {email}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">I am joining as</h2>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Member type">
          {MEMBER_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={memberType === t.value}
              onClick={() => setMemberType(t.value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-4 text-left transition",
                memberType === t.value ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <t.icon className="h-5 w-5 text-primary" />
              <span className="font-semibold text-slate-900">{t.label}</span>
              <span className="text-xs text-slate-500">{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Your district</h2>
        <StateDistrictSelect
          stateId={location.stateId}
          districtId={location.districtId}
          onChange={(v) => setLocation({ stateId: v.stateId, districtId: v.districtId })}
          disabled={submitting}
        />
        <p className="text-xs text-slate-500">
          Your district association manages your registration, events and equipment. To move later, raise a District Change request.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Address (optional — used for equipment delivery)</h2>
        <div className="space-y-1.5">
          <Label htmlFor="ob-address">Address</Label>
          <Input id="ob-address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ob-city">City</Label>
            <Input id="ob-city" value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-pincode">Pincode</Label>
            <Input id="ob-pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} autoComplete="postal-code" />
            {!pincodeValid && <p className="text-xs text-red-600">Enter a 6-digit pincode.</p>}
          </div>
        </div>
      </section>

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete registration"}
      </Button>
    </form>
  );
}
