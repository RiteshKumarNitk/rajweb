"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, User, MapPin, Save, Loader2 } from "lucide-react";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Primary Sign-in Email */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sign-in Account Email
          </Label>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <Lock className="h-3 w-3" /> Locked
          </span>
        </div>
        <div className="flex h-10 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          {initial.email}
        </div>
        <p className="text-[11px] text-slate-400">
          Your email address is managed through your primary authentication provider (Google / Email OTP).
        </p>
      </div>

      {/* Section 1: Personal Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <User className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-primary">Personal Details</h3>
        </div>

        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            { name: "name", label: "Full Name (as on Government ID)", placeholder: "e.g. Rahul Sharma" },
            { name: "phone", label: "Mobile Number", type: "tel", placeholder: "10-digit mobile number" },
            { name: "dateOfBirth", label: "Date of Birth", type: "date" },
            {
              name: "gender",
              label: "Gender",
              type: "select",
              options: [
                { label: "Select Gender", value: "" },
                { label: "Male", value: "MALE" },
                { label: "Female", value: "FEMALE" },
                { label: "Other", value: "OTHER" },
              ],
            },
          ]}
        />
      </div>

      {/* Section 2: Address Information */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-bold text-primary">Residential Address</h3>
        </div>

        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            { name: "address", label: "Street Address", type: "textarea", placeholder: "House/Flat no., Street, Colony" },
            { name: "city", label: "City / Town", placeholder: "e.g. Jaipur" },
            { name: "state", label: "State", placeholder: "e.g. Rajasthan" },
            { name: "country", label: "Country", placeholder: "India" },
            { name: "pincode", label: "Pincode (6 digits)", placeholder: "e.g. 302001" },
          ]}
        />
      </div>

      {/* Submit Button */}
      <div className="border-t border-slate-100 pt-4 flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[140px] bg-primary text-white hover:bg-slate-800 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
