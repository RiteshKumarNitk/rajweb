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

const playerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  mobile: z.string().min(10, "Enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  district: z.string().min(1, "Select a district"),
  category: z.string().min(1, "Select a playing category"),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export interface PlayerResubmitData {
  id: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  district: string;
  category: string;
}

export function PlayerAccountForm({
  prefill,
  resubmit,
}: {
  prefill: { name: string; email: string; phone: string };
  resubmit?: PlayerResubmitData;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: prefill.name,
      email: prefill.email,
      mobile: prefill.phone,
      gender: resubmit?.gender ?? "MALE",
      dateOfBirth: resubmit?.dateOfBirth ?? "",
      district: resubmit?.district ?? "",
      category: resubmit?.category ?? "",
    },
  });

  async function onSubmit(data: PlayerFormData) {
    try {
      const res = resubmit
        ? await apiPost(`/api/players/${resubmit.id}/resubmit`, data)
        : await apiPost("/api/players/register", data);
      const { message } = await handleApiFetch<{ playerId: string }>(res);
      toast.success(message ?? (resubmit ? "Application resubmitted" : "Player registration submitted"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (resubmit ? "Resubmission failed" : "Registration failed"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <FormBuilder
        register={register}
        errors={errors}
        fields={[
          { name: "name", label: "Full Name", placeholder: "Your full name" },
          { name: "email", label: "Email", type: "email" },
          { name: "mobile", label: "Mobile Number", type: "tel", placeholder: "10-digit mobile number" },
          { name: "dateOfBirth", label: "Date of Birth", type: "date" },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            options: [
              { label: "Male", value: "MALE" },
              { label: "Female", value: "FEMALE" },
              { label: "Other", value: "OTHER" },
            ],
          },
          {
            name: "district",
            label: "District",
            type: "select",
            options: [
              { label: "Select district", value: "" },
              ...rajasthanDistricts.map((d) => ({ label: d, value: d })),
            ],
          },
          {
            name: "category",
            label: "Playing Category",
            type: "select",
            options: [
              { label: "Select category", value: "" },
              { label: "Sub-Junior", value: "Sub-Junior" },
              { label: "Junior", value: "Junior" },
              { label: "Senior", value: "Senior" },
              { label: "Master", value: "Master" },
            ],
          },
        ]}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : resubmit ? "Resubmit Application" : "Submit Player Registration"}
      </Button>
    </form>
  );
}
