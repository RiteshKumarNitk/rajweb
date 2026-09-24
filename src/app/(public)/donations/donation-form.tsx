"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const donationSchema = z.object({
  donorName: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  amount: z.string().min(1, "Please enter an amount"),
  purpose: z.string().min(1, "Please select a purpose"),
  panNumber: z.string().optional(),
  message: z.string().optional(),
});

type DonationFormData = z.infer<typeof donationSchema>;

export function DonationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
  });

  async function onSubmit(data: DonationFormData) {
    if (blockSubmitForStaticRelease("Donations")) return;
    try {
      const res = await apiPost("/api/donations", {
          name: data.donorName,
          email: data.email,
          mobile: data.phone,
          amount: Number(data.amount),
          message: data.message ? `${data.purpose}: ${data.message}` : data.purpose,
        });
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Thank you for your generous support!");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process donation");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="Donations" />
      <div className="grid gap-6 sm:grid-cols-2">
        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            { name: "donorName", label: "Full Name", placeholder: "Your full name" },
            { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { name: "phone", label: "Phone", type: "tel", placeholder: "+91 XXXXX XXXXX" },
            { name: "amount", label: "Donation Amount (₹)", type: "number", min: "100", placeholder: "1000" },
            {
              name: "purpose",
              label: "Purpose",
              type: "select",
              options: [
                { label: "Select purpose", value: "" },
                { label: "General Development", value: "General Development" },
                { label: "Youth Programs", value: "Youth Programs" },
                { label: "Court Construction", value: "Court Construction" },
                { label: "Tournament Sponsorship", value: "Tournament Sponsorship" },
                { label: "Equipment Support", value: "Equipment Support" },
              ],
            },
            { name: "panNumber", label: "PAN Number (Optional, for 80G receipt)", placeholder: "ABCDE1234F" },
            { name: "message", label: "Message (Optional)", type: "textarea", placeholder: "Any specific instructions or dedication...", className: "sm:col-span-2" },
          ]}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Processing..." : "Pledge Donation"}
      </Button>
    </form>
  );
}
