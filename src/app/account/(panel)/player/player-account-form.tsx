"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { StateDistrictSelect } from "@/shared/components/forms/state-district-select";
import {
  GovernmentIdFields,
  checkGovernmentId,
  governmentIdFormShape,
  governmentIdPayload,
  type GovernmentIdOnFile,
  type GovernmentIdValue,
} from "@/shared/components/forms/government-id-fields";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const playerShape = {
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  mobile: z.string().min(10, "Enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  // Ids from the server-filtered picker; the API re-checks the district is in the state.
  stateId: z.string().min(1, "Select your state"),
  districtId: z.string().min(1, "Select your district"),
  category: z.string().min(1, "Select a playing category"),
  ...governmentIdFormShape,
};

type PlayerFormData = z.infer<z.ZodObject<typeof playerShape>>;

export interface PlayerResubmitData {
  id: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  stateId: string;
  districtId: string;
  category: string;
  governmentId: GovernmentIdOnFile | null;
}

export function PlayerAccountForm({
  prefill,
  resubmit,
}: {
  prefill: { name: string; email: string; phone: string };
  resubmit?: PlayerResubmitData;
}) {
  const router = useRouter();
  const schema = useMemo(
    () => z.object(playerShape).superRefine(checkGovernmentId(resubmit?.governmentId)),
    [resubmit?.governmentId]
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<PlayerFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: prefill.name,
      email: prefill.email,
      mobile: prefill.phone,
      gender: resubmit?.gender ?? "MALE",
      dateOfBirth: resubmit?.dateOfBirth ?? "",
      stateId: resubmit?.stateId ?? "",
      districtId: resubmit?.districtId ?? "",
      category: resubmit?.category ?? "",
      governmentIdType: resubmit?.governmentId?.type ?? "",
      governmentIdNumber: "",
      governmentIdDocumentId: "",
    },
  });
  const stateId = watch("stateId");
  const districtId = watch("districtId");
  const governmentId: GovernmentIdValue = {
    governmentIdType: watch("governmentIdType") as GovernmentIdValue["governmentIdType"],
    governmentIdNumber: watch("governmentIdNumber"),
    governmentIdDocumentId: watch("governmentIdDocumentId"),
  };
  const onLocationChange = useCallback(
    (v: { stateId: string; districtId: string }) => {
      setValue("stateId", v.stateId, { shouldValidate: Boolean(v.stateId) });
      setValue("districtId", v.districtId, { shouldValidate: Boolean(v.districtId) });
    },
    [setValue]
  );

  async function onSubmit(data: PlayerFormData) {
    const payload = { ...data, ...governmentIdPayload(data) };
    try {
      const res = resubmit
        ? await apiPost(`/api/players/${resubmit.id}/resubmit`, payload)
        : await apiPost("/api/players/register", payload);
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
        ]}
      />
      <StateDistrictSelect
        stateId={stateId}
        districtId={districtId}
        onChange={onLocationChange}
        disabled={isSubmitting}
        errors={{ stateId: errors.stateId?.message, districtId: errors.districtId?.message }}
      />
      <FormBuilder
        register={register}
        errors={errors}
        fields={[
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
      <GovernmentIdFields
        value={governmentId}
        onChange={(v) => {
          for (const [key, val] of Object.entries(v)) {
            setValue(key as keyof GovernmentIdValue, val as string, { shouldValidate: isSubmitted });
          }
        }}
        errors={{
          governmentIdType: errors.governmentIdType?.message,
          governmentIdNumber: errors.governmentIdNumber?.message,
          governmentIdDocumentId: errors.governmentIdDocumentId?.message,
        }}
        onFile={resubmit?.governmentId}
        disabled={isSubmitting}
      />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : resubmit ? "Resubmit Application" : "Submit Player Registration"}
      </Button>
    </form>
  );
}
