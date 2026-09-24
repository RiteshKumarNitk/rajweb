"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { rajasthanDistricts } from "@/shared/config/site";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const academySchema = z.object({
  academyName: z.string().min(2, "Academy name is required"),
  directorName: z.string().min(2, "Director name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  district: z.string().min(1, "Please select a district"),
  address: z.string().min(10, "Please provide a complete address"),
  coachCount: z.string().min(1, "Number of coaches is required"),
  playerCapacity: z.string().min(1, "Player capacity is required"),
  certificationLevel: z.string().min(1, "Certification level is required"),
  additionalInfo: z.string().optional(),
});

type AcademyFormData = z.infer<typeof academySchema>;

export function AcademyMembershipForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AcademyFormData>({
    resolver: zodResolver(academySchema),
  });

  async function onSubmit(data: AcademyFormData) {
    if (blockSubmitForStaticRelease("Academy membership")) return;
    try {
      const response = await apiPost("/api/memberships/academy", { ...data, coachCount: Number(data.coachCount) });
      const { data: payload, message } = await handleApiFetch<{ membershipId: string }>(response);
      toast.success(message ?? `Application submitted! ID: ${payload.membershipId}`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="Academy membership" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="academyName">Academy Name</Label>
          <Input id="academyName" placeholder="Academy name" {...register("academyName")} />
          {errors.academyName && <p className="text-sm text-secondary">{errors.academyName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="directorName">Director / Head Coach</Label>
          <Input id="directorName" placeholder="Director's name" {...register("directorName")} />
          {errors.directorName && <p className="text-sm text-secondary">{errors.directorName.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="academy@example.com" {...register("email")} />
          {errors.email && <p className="text-sm text-secondary">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+91 XXXXX XXXXX" {...register("phone")} />
          {errors.phone && <p className="text-sm text-secondary">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="district">District</Label>
          <select
            id="district"
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("district")}
            defaultValue=""
          >
            <option value="" disabled>Select district</option>
            {rajasthanDistricts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.district && <p className="text-sm text-secondary">{errors.district.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="certificationLevel">Highest Coach Certification</Label>
          <select
            id="certificationLevel"
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("certificationLevel")}
            defaultValue=""
          >
            <option value="" disabled>Select level</option>
            <option value="Level 1">Level 1</option>
            <option value="Level 2">Level 2</option>
            <option value="Level 3">Level 3</option>
            <option value="International">International</option>
          </select>
          {errors.certificationLevel && <p className="text-sm text-secondary">{errors.certificationLevel.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="coachCount">Number of Coaches</Label>
          <Input id="coachCount" type="number" min="1" placeholder="2" {...register("coachCount")} />
          {errors.coachCount && <p className="text-sm text-secondary">{errors.coachCount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="playerCapacity">Player Capacity</Label>
          <Input id="playerCapacity" type="number" min="1" placeholder="30" {...register("playerCapacity")} />
          {errors.playerCapacity && <p className="text-sm text-secondary">{errors.playerCapacity.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Academy Address</Label>
        <Textarea id="address" placeholder="Full academy address" {...register("address")} />
        {errors.address && <p className="text-sm text-secondary">{errors.address.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
        <Textarea id="additionalInfo" placeholder="Training programs, court facilities, etc." {...register("additionalInfo")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
