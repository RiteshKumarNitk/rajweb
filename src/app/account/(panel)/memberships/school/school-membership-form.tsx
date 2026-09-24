"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { rajasthanDistricts } from "@/shared/config/site";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const schoolSchema = z.object({
  schoolName: z.string().min(2, "School name is required"),
  principalName: z.string().min(2, "Principal name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
  district: z.string().min(1, "Select a district"),
  address: z.string().min(10, "Address is required"),
  studentCount: z.string().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export interface SchoolResubmitData {
  id: string;
  schoolName: string;
  district: string;
  address: string;
  studentCount: number | null;
}

export function SchoolMembershipForm({
  prefill,
  resubmit,
}: {
  prefill: { principalName: string; email: string; phone: string };
  resubmit?: SchoolResubmitData;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      principalName: prefill.principalName,
      email: prefill.email,
      phone: prefill.phone,
      schoolName: resubmit?.schoolName ?? "",
      district: resubmit?.district ?? "",
      address: resubmit?.address ?? "",
      studentCount: resubmit?.studentCount ? String(resubmit.studentCount) : "",
    },
  });

  async function onSubmit(data: SchoolFormData) {
    try {
      const payload = {
        ...data,
        studentCount: data.studentCount ? Number(data.studentCount) : undefined,
      };
      const res = resubmit
        ? await apiPost(`/api/memberships/school/${resubmit.id}/resubmit`, payload)
        : await apiPost("/api/memberships/school", payload);
      const { message } = await handleApiFetch<{ membershipId: string }>(res);
      toast.success(message ?? (resubmit ? "Application resubmitted" : "School membership application submitted"));
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
          { name: "schoolName", label: "School Name", placeholder: "School name" },
          { name: "principalName", label: "Principal Name", placeholder: "Your full name" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel", placeholder: "10-digit mobile number" },
          {
            name: "district",
            label: "District",
            type: "select",
            options: [
              { label: "Select district", value: "" },
              ...rajasthanDistricts.map((d) => ({ label: d, value: d })),
            ],
          },
          { name: "address", label: "Address", type: "textarea", placeholder: "Full school address" },
          { name: "studentCount", label: "Student Count (optional)", type: "number" },
        ]}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : resubmit ? "Resubmit Application" : "Submit Application"}
      </Button>
    </form>
  );
}
