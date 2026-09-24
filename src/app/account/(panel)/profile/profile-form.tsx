"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { apiFetch, handleApiFetch } from "@/lib/api-client";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .or(z.literal(""))
    .optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["", "MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .or(z.literal(""))
    .optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export interface ProfileInitialValues extends ProfileFormData {
  email: string;
}

export function ProfileForm({ initial }: { initial: ProfileInitialValues }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  async function onSubmit(data: ProfileFormData) {
    try {
      const res = await apiFetch("/api/account/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Profile updated successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label>Email</Label>
        <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
          <Mail className="h-4 w-4 shrink-0" />
          {initial.email}
        </div>
        <p className="text-xs text-slate-400">Your email is tied to your sign-in account and can&apos;t be changed here.</p>
      </div>

      <FormBuilder
        register={register}
        errors={errors}
        fields={[
          { name: "name", label: "Full Name", placeholder: "Your full name" },
          { name: "phone", label: "Mobile Number", type: "tel", placeholder: "10-digit mobile number" },
          { name: "dateOfBirth", label: "Date of Birth", type: "date" },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            options: [
              { label: "Prefer not to say", value: "" },
              { label: "Male", value: "MALE" },
              { label: "Female", value: "FEMALE" },
              { label: "Other", value: "OTHER" },
            ],
          },
        ]}
      />

      <div className="border-t border-slate-200 pt-5">
        <p className="mb-3 text-sm font-semibold text-primary">Address</p>
        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            { name: "address", label: "Address", type: "textarea", placeholder: "House no., street, area" },
            { name: "city", label: "City", placeholder: "City" },
            { name: "state", label: "State", placeholder: "State" },
            { name: "country", label: "Country", placeholder: "Country" },
            { name: "pincode", label: "Pincode", placeholder: "6-digit pincode" },
          ]}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
