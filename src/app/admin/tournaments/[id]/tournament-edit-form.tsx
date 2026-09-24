"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

export type DistrictOption = { id: string; name: string };

export interface TournamentDetail {
  id: string;
  name: string;
  description: string | null;
  category: "JUNIOR" | "SENIOR" | "OPEN" | "PROFESSIONAL";
  status: "DRAFT" | "REGISTRATION_OPEN" | "REGISTRATION_CLOSED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  districtId: string | null;
  venue: string | null;
  city: string | null;
  startDate: string;
  endDate: string;
  registrationStart: string | null;
  registrationDeadline: string | null;
  maxParticipants: number | null;
  banner: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  requiresApprovedPlayer: boolean;
}

interface TournamentFormData {
  name: string;
  description: string;
  category: string;
  status: string;
  districtId: string;
  venue: string;
  city: string;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationDeadline: string;
  maxParticipants: string;
  banner: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  requiresApprovedPlayer: boolean;
}

export function TournamentEditForm({
  tournament,
  districts,
  lockedDistrictId,
  readOnly,
}: {
  tournament: TournamentDetail;
  districts: DistrictOption[];
  lockedDistrictId?: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [posterPreviewError, setPosterPreviewError] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TournamentFormData>({
    defaultValues: {
      name: tournament.name,
      description: tournament.description ?? "",
      category: tournament.category,
      status: tournament.status,
      districtId: tournament.districtId ?? "",
      venue: tournament.venue ?? "",
      city: tournament.city ?? "",
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      registrationStart: tournament.registrationStart ?? "",
      registrationDeadline: tournament.registrationDeadline ?? "",
      maxParticipants: tournament.maxParticipants ? String(tournament.maxParticipants) : "",
      banner: tournament.banner ?? "",
      contactName: tournament.contactName ?? "",
      contactPhone: tournament.contactPhone ?? "",
      contactEmail: tournament.contactEmail ?? "",
      requiresApprovedPlayer: tournament.requiresApprovedPlayer,
    },
  });

  const banner = watch("banner");

  async function onSubmit(data: TournamentFormData) {
    try {
      const res = await apiFetch(`/api/admin/tournaments/${tournament.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...data,
          districtId: lockedDistrictId || data.districtId || null,
          maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : null,
          description: data.description.trim() || undefined,
          venue: data.venue.trim() || undefined,
          city: data.city.trim() || undefined,
          registrationStart: data.registrationStart || null,
          registrationDeadline: data.registrationDeadline || null,
          banner: data.banner.trim() || null,
          contactName: data.contactName.trim() || null,
          contactPhone: data.contactPhone.trim() || null,
          contactEmail: data.contactEmail.trim() || null,
        }),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Tournament updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tournament");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Basic Information</p>
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name</Label>
            <Input id="name" {...register("name", { required: true, minLength: 3 })} />
            {errors.name && <p className="text-sm text-secondary">Name is required</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" className="h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm" {...register("category")}>
                <option value="OPEN">Open</option>
                <option value="JUNIOR">Junior</option>
                <option value="SENIOR">Senior</option>
                <option value="PROFESSIONAL">Professional</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" className="h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm" {...register("status")}>
                <option value="DRAFT">Draft</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="REGISTRATION_CLOSED">Registration Closed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Location</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="districtId">District</Label>
              <select
                id="districtId"
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-4 text-sm disabled:bg-slate-100"
                {...register("districtId")}
                disabled={Boolean(lockedDistrictId)}
              >
                {!lockedDistrictId && <option value="">State-wide (all districts)</option>}
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City / Location</Label>
              <Input id="city" {...register("city")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" {...register("venue")} />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Dates &amp; Registration Window</p>
          <p className="text-xs text-slate-400">Times are India Standard Time. Registration must end before the tournament starts.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tournament Start</Label>
              <Input id="startDate" type="datetime-local" {...register("startDate", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tournament End</Label>
              <Input id="endDate" type="datetime-local" {...register("endDate", { required: true })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="registrationStart">Registration Start</Label>
              <Input id="registrationStart" type="datetime-local" {...register("registrationStart")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">Registration End</Label>
              <Input id="registrationDeadline" type="datetime-local" {...register("registrationDeadline")} />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Registration &amp; Eligibility</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input id="maxParticipants" type="number" min="1" {...register("maxParticipants")} />
            </div>
            <div className="flex items-center gap-2 pt-7">
              <input id="requiresApprovedPlayer" type="checkbox" className="h-4 w-4" {...register("requiresApprovedPlayer")} />
              <Label htmlFor="requiresApprovedPlayer" className="font-normal">Requires an approved Player registration</Label>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Poster</p>
          <div className="space-y-2">
            <Label htmlFor="banner">Poster URL (Google Drive link)</Label>
            <Input
              id="banner"
              placeholder="https://drive.google.com/..."
              {...register("banner", { onChange: () => setPosterPreviewError(false) })}
            />
            {banner && !posterPreviewError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt="Poster preview"
                className="mt-2 h-32 w-auto rounded-md border border-slate-200 object-cover"
                onError={() => setPosterPreviewError(true)}
              />
            )}
            {banner && posterPreviewError && (
              <p className="text-xs text-slate-400">Preview unavailable — link will still be saved and shown to users as a clickable link.</p>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Contact</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input id="contactName" {...register("contactName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input id="contactPhone" {...register("contactPhone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input id="contactEmail" type="email" {...register("contactEmail")} />
            </div>
          </div>
        </div>

        {!readOnly && (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </fieldset>
    </form>
  );
}
