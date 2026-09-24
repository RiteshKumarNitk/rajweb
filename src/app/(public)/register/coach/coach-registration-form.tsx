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

const coachSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  district: z.string().min(1, "Please select a district"),
  certificationLevel: z.string().min(1, "Please select certification level"),
  experienceYears: z.string().min(1, "Experience is required"),
  affiliatedClub: z.string().optional(),
  qualifications: z.string().min(10, "Please describe your qualifications"),
  aadharNumber: z.string().min(12, "Aadhar number must be 12 digits").max(12),
});

type CoachFormData = z.infer<typeof coachSchema>;

export function CoachRegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CoachFormData>({
    resolver: zodResolver(coachSchema),
  });

  async function onSubmit(data: CoachFormData) {
    if (blockSubmitForStaticRelease("Coach registration")) return;
    try {
      const levelMap: Record<string, string> = {
        "level-1": "LEVEL_1",
        "level-2": "LEVEL_2",
        "level-3": "LEVEL_3",
        international: "INTERNATIONAL",
      };
      const response = await apiPost("/api/coaches/register", {
          name: data.fullName,
          email: data.email,
          mobile: data.phone,
          qualification: data.qualifications,
          certificationLevel: levelMap[data.certificationLevel] || "LEVEL_1",
          district: data.district,
        });
      const { data: payload, message } = await handleApiFetch<{ coachId: string }>(response);
      toast.success(message ?? `Registration submitted! Coach ID: ${payload.coachId}`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="Coach registration" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" placeholder="Your full name" {...register("fullName")} />
          {errors.fullName && <p className="text-sm text-secondary">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="coach@example.com" {...register("email")} />
          {errors.email && <p className="text-sm text-secondary">{errors.email.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+91 XXXXX XXXXX" {...register("phone")} />
          {errors.phone && <p className="text-sm text-secondary">{errors.phone.message}</p>}
        </div>
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
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="certificationLevel">Certification Level</Label>
          <select
            id="certificationLevel"
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("certificationLevel")}
            defaultValue=""
          >
            <option value="" disabled>Select level</option>
            <option value="Level 1">Level 1 — Beginner Coach</option>
            <option value="Level 2">Level 2 — Intermediate Coach</option>
            <option value="Level 3">Level 3 — Advanced Coach</option>
            <option value="International">International Certification</option>
            <option value="None">Applying for Certification</option>
          </select>
          {errors.certificationLevel && <p className="text-sm text-secondary">{errors.certificationLevel.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="experienceYears">Years of Experience</Label>
          <Input id="experienceYears" type="number" min="0" placeholder="5" {...register("experienceYears")} />
          {errors.experienceYears && <p className="text-sm text-secondary">{errors.experienceYears.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="affiliatedClub">Affiliated Club / Academy (Optional)</Label>
          <Input id="affiliatedClub" placeholder="Club or academy name" {...register("affiliatedClub")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aadharNumber">Aadhar Number</Label>
          <Input id="aadharNumber" placeholder="12-digit Aadhar number" maxLength={12} {...register("aadharNumber")} />
          {errors.aadharNumber && <p className="text-sm text-secondary">{errors.aadharNumber.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qualifications">Qualifications & Experience</Label>
        <Textarea
          id="qualifications"
          placeholder="Describe your coaching qualifications, certifications, and experience..."
          {...register("qualifications")}
        />
        {errors.qualifications && <p className="text-sm text-secondary">{errors.qualifications.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registering..." : "Register as Coach"}
      </Button>
    </form>
  );
}
