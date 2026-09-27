"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { useRegistrationLocations } from "@/shared/components/forms/registration-locations-context";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const academySchema = z.object({
  academyName: z.string().min(2, "Academy name is required"),
  directorName: z.string().min(2, "Director name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
  district: z.string().min(1, "Select a district"),
  // State slug; auto-filled when only one state is active.
  state: z.string().optional(),
  address: z.string().min(10, "Address is required"),
  coachCount: z.string().optional(),
});

type AcademyFormData = z.infer<typeof academySchema>;

export interface AcademyResubmitData {
  id: string;
  academyName: string;
  district: string;
  address: string;
  coachCount: number | null;
}

export function AcademyMembershipForm({
  prefill,
  resubmit,
}: {
  prefill: { directorName: string; email: string; phone: string };
  resubmit?: AcademyResubmitData;
}) {
  const router = useRouter();
  const loc = useRegistrationLocations();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcademyFormData>({
    resolver: zodResolver(academySchema),
    defaultValues: {
      directorName: prefill.directorName,
      email: prefill.email,
      phone: prefill.phone,
      academyName: resubmit?.academyName ?? "",
      district: resubmit?.district ?? "",
      state: loc.initialState(resubmit?.district),
      address: resubmit?.address ?? "",
      coachCount: resubmit?.coachCount ? String(resubmit.coachCount) : "",
    },
  });  const districtOptions = loc.districtsFor(watch("state"));


  async function onSubmit(data: AcademyFormData) {
    try {
      const payload = {
        ...data,
        coachCount: data.coachCount ? Number(data.coachCount) : undefined,
      };
      const res = resubmit
        ? await apiPost(`/api/memberships/academy/${resubmit.id}/resubmit`, payload)
        : await apiPost("/api/memberships/academy", payload);
      const { message } = await handleApiFetch<{ membershipId: string }>(res);
      toast.success(message ?? (resubmit ? "Application resubmitted" : "Academy membership application submitted"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (resubmit ? "Resubmission failed" : "Submission failed"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormBuilder
        register={register}
        errors={errors}
        fields={[
          { name: "academyName", label: "Academy Name", placeholder: "Academy name" },
          { name: "directorName", label: "Director / Head Coach", placeholder: "Your full name" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel", placeholder: "10-digit mobile number" },
          ...(loc.multiState
            ? [
                {
                  name: "state" as const,
                  label: "State",
                  type: "select" as const,
                  options: [
                    { label: "Select state", value: "" },
                    ...loc.locations.map((l) => ({ label: l.name, value: l.slug })),
                  ],
                },
              ]
            : []),
          {
            name: "district",
            label: "District",
            type: "select",
            options: [
              { label: "Select district", value: "" },
              ...districtOptions.map((d) => ({ label: d, value: d })),
            ],
          },
          { name: "address", label: "Address", type: "textarea", placeholder: "Full academy address" },
          { name: "coachCount", label: "Number of Coaches (optional)", type: "number" },
        ]}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : resubmit ? "Resubmit Application" : "Submit Application"}
      </Button>
    </form>
  );
}
