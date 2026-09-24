"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { tournamentDateOrderError } from "@/modules/tournaments/tournament-dates";

export type DistrictOption = { id: string; name: string };

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const tournamentSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    description: z.string().optional(),
    category: z.enum(["JUNIOR", "SENIOR", "OPEN", "PROFESSIONAL"]),
    status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    districtId: z.string().optional(),
    venue: z.string().optional(),
    city: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    registrationStart: z.string().optional(),
    registrationDeadline: z.string().optional(),
    maxParticipants: z.string().optional(),
    banner: z.string().optional().refine((value) => !value || isValidUrl(value), "Poster must be a valid URL"),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
    requiresApprovedPlayer: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const message = tournamentDateOrderError({
      startDate: data.startDate,
      endDate: data.endDate,
      registrationStart: data.registrationStart || null,
      registrationDeadline: data.registrationDeadline || null,
    });
    if (!message) return;
    const path = message.startsWith("Registration start")
      ? "registrationStart"
      : message.startsWith("Registration end")
        ? "registrationDeadline"
        : "endDate";
    ctx.addIssue({ code: "custom", message, path: [path] });
  });

type TournamentFormData = z.infer<typeof tournamentSchema>;

export function AddTournamentModal({
  open,
  onClose,
  districts,
  lockedDistrictId,
}: {
  open: boolean;
  onClose: () => void;
  districts: DistrictOption[];
  lockedDistrictId?: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      category: "OPEN",
      status: "DRAFT",
      districtId: lockedDistrictId ?? "",
      requiresApprovedPlayer: true,
    },
  });

  if (!open) return null;

  async function onSubmit(data: TournamentFormData) {
    try {
      const res = await apiFetch("/api/admin/tournaments", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          districtId: lockedDistrictId || data.districtId || undefined,
          maxParticipants: data.maxParticipants ? Number(data.maxParticipants) : undefined,
          description: data.description?.trim() || undefined,
          venue: data.venue?.trim() || undefined,
          city: data.city?.trim() || undefined,
          registrationStart: data.registrationStart || undefined,
          registrationDeadline: data.registrationDeadline || undefined,
          banner: data.banner?.trim() || undefined,
          contactName: data.contactName?.trim() || undefined,
          contactPhone: data.contactPhone?.trim() || undefined,
          contactEmail: data.contactEmail?.trim() || undefined,
        }),
      });
      const { data: created, message } = await handleApiFetch<{ id: string }>(res);
      toast.success(message ?? "Tournament created");
      onClose();
      router.push(`/admin/tournaments/${created.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tournament");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Add Tournament</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Create the tournament, then set category pricing on the next screen. New tournaments start as drafts.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Basic Information</p>
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input id="name" placeholder="e.g. Rajasthan State Championship" {...register("name")} />
                {errors.name && <p className="text-sm text-secondary">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={3} {...register("description")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Classification</Label>
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
                  <Input id="startDate" type="datetime-local" {...register("startDate")} />
                  {errors.startDate && <p className="text-sm text-secondary">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tournament End</Label>
                  <Input id="endDate" type="datetime-local" {...register("endDate")} />
                  {errors.endDate && <p className="text-sm text-secondary">{errors.endDate.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registrationStart">Registration Start</Label>
                  <Input id="registrationStart" type="datetime-local" {...register("registrationStart")} />
                  {errors.registrationStart && <p className="text-sm text-secondary">{errors.registrationStart.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationDeadline">Registration End</Label>
                  <Input id="registrationDeadline" type="datetime-local" {...register("registrationDeadline")} />
                  {errors.registrationDeadline && <p className="text-sm text-secondary">{errors.registrationDeadline.message}</p>}
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
                <Input id="banner" placeholder="https://drive.google.com/..." {...register("banner")} />
                {errors.banner && <p className="text-sm text-secondary">{errors.banner.message}</p>}
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
                  {errors.contactEmail && <p className="text-sm text-secondary">{errors.contactEmail.message}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Tournament"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
