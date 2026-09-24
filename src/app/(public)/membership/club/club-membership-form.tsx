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

const clubSchema = z.object({
  clubName: z.string().min(2, "Club name is required"),
  contactPerson: z.string().min(2, "Contact person name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  district: z.string().min(1, "Please select a district"),
  address: z.string().min(10, "Please provide a complete address"),
  courts: z.string().min(1, "Number of courts is required"),
  establishedYear: z.string().min(4, "Year is required"),
  additionalInfo: z.string().optional(),
});

type ClubFormData = z.infer<typeof clubSchema>;

export function ClubMembershipForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
  });

  async function onSubmit(data: ClubFormData) {
    if (blockSubmitForStaticRelease("Club membership")) return;
    try {
      const response = await apiPost("/api/memberships/club", { ...data, courts: Number(data.courts) });
      const { data: payload, message } = await handleApiFetch<{ membershipId: string }>(response);
      toast.success(message ?? `Application submitted! ID: ${payload.membershipId}`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="Club membership" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clubName">Club Name</Label>
          <Input id="clubName" placeholder="Your club name" {...register("clubName")} />
          {errors.clubName && <p className="text-sm text-secondary">{errors.clubName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input id="contactPerson" placeholder="Primary contact name" {...register("contactPerson")} />
          {errors.contactPerson && <p className="text-sm text-secondary">{errors.contactPerson.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="club@example.com" {...register("email")} />
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
          <Label htmlFor="courts">Number of Courts</Label>
          <Input id="courts" type="number" min="1" placeholder="1" {...register("courts")} />
          {errors.courts && <p className="text-sm text-secondary">{errors.courts.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Club Address</Label>
        <Textarea id="address" placeholder="Full club address" {...register("address")} />
        {errors.address && <p className="text-sm text-secondary">{errors.address.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="establishedYear">Year Established</Label>
        <Input id="establishedYear" placeholder="e.g. 2020" {...register("establishedYear")} />
        {errors.establishedYear && <p className="text-sm text-secondary">{errors.establishedYear.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
        <Textarea id="additionalInfo" placeholder="Facilities, coaching staff, etc." {...register("additionalInfo")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
