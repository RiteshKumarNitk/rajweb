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

const coachShape = {
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  mobile: z.string().min(10, "Enter a valid phone number"),
  qualification: z.string().min(2, "Qualification is required"),
  certificationLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "INTERNATIONAL"]),
  // Ids from the server-filtered picker; the API re-checks the district is in the state.
  stateId: z.string().min(1, "Select your state"),
  districtId: z.string().min(1, "Select your district"),
  ...governmentIdFormShape,
};

type CoachFormData = z.infer<z.ZodObject<typeof coachShape>>;

export interface CoachResubmitData {
  id: string;
  qualification: string;
  certificationLevel: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "INTERNATIONAL";
  stateId: string;
  districtId: string;
  governmentId: GovernmentIdOnFile | null;
}

export function CoachAccountForm({
  prefill,
  resubmit,
}: {
  prefill: { name: string; email: string; phone: string };
  resubmit?: CoachResubmitData;
}) {
  const router = useRouter();
  const schema = useMemo(
    () => z.object(coachShape).superRefine(checkGovernmentId(resubmit?.governmentId)),
    [resubmit?.governmentId]
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<CoachFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: prefill.name,
      email: prefill.email,
      mobile: prefill.phone,
      qualification: resubmit?.qualification ?? "",
      certificationLevel: resubmit?.certificationLevel ?? "LEVEL_1",
      stateId: resubmit?.stateId ?? "",
      districtId: resubmit?.districtId ?? "",
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

  async function onSubmit(data: CoachFormData) {
    const payload = { ...data, ...governmentIdPayload(data) };
    try {
      const res = resubmit
        ? await apiPost(`/api/coaches/${resubmit.id}/resubmit`, payload)
        : await apiPost("/api/coaches/register", payload);
      const { message } = await handleApiFetch<{ coachId: string }>(res);
      toast.success(message ?? (resubmit ? "Application resubmitted" : "Coach registration submitted"));
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
          { name: "qualification", label: "Qualification", placeholder: "e.g. IRA Level 2 Certified Coach" },
          {
            name: "certificationLevel",
            label: "Certification Level",
            type: "select",
            options: [
              { label: "Level 1", value: "LEVEL_1" },
              { label: "Level 2", value: "LEVEL_2" },
              { label: "Level 3", value: "LEVEL_3" },
              { label: "International", value: "INTERNATIONAL" },
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
        {isSubmitting ? "Submitting..." : resubmit ? "Resubmit Application" : "Submit Coach Registration"}
      </Button>
    </form>
  );
}
