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

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name is required"),
  principalName: z.string().min(2, "Principal name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  district: z.string().min(1, "Please select a district"),
  address: z.string().min(10, "Please provide a complete address"),
  boardAffiliation: z.string().min(2, "Board affiliation is required"),
  studentCount: z.string().min(1, "Estimated student count is required"),
  sportsIncharge: z.string().min(2, "Sports incharge name is required"),
  additionalInfo: z.string().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export function SchoolMembershipForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
  });

  async function onSubmit(data: SchoolFormData) {
    if (blockSubmitForStaticRelease("School membership")) return;
    try {
      const response = await apiPost("/api/memberships/school", { ...data, studentCount: Number(data.studentCount) });
      const { data: payload, message } = await handleApiFetch<{ membershipId: string }>(response);
      toast.success(message ?? `Application submitted! ID: ${payload.membershipId}`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="School membership" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input id="schoolName" placeholder="School name" {...register("schoolName")} />
          {errors.schoolName && <p className="text-sm text-secondary">{errors.schoolName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="principalName">Principal Name</Label>
          <Input id="principalName" placeholder="Principal's name" {...register("principalName")} />
          {errors.principalName && <p className="text-sm text-secondary">{errors.principalName.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="school@example.com" {...register("email")} />
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
          <Label htmlFor="boardAffiliation">Board Affiliation</Label>
          <Input id="boardAffiliation" placeholder="e.g. CBSE, RBSE" {...register("boardAffiliation")} />
          {errors.boardAffiliation && <p className="text-sm text-secondary">{errors.boardAffiliation.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sportsIncharge">Sports Incharge</Label>
          <Input id="sportsIncharge" placeholder="Sports teacher/coordinator" {...register("sportsIncharge")} />
          {errors.sportsIncharge && <p className="text-sm text-secondary">{errors.sportsIncharge.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentCount">Estimated Students Interested</Label>
          <Input id="studentCount" type="number" min="1" placeholder="50" {...register("studentCount")} />
          {errors.studentCount && <p className="text-sm text-secondary">{errors.studentCount.message}</p>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">School Address</Label>
        <Textarea id="address" placeholder="Full school address" {...register("address")} />
        {errors.address && <p className="text-sm text-secondary">{errors.address.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
        <Textarea id="additionalInfo" placeholder="Existing sports facilities, programs, etc." {...register("additionalInfo")} />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
