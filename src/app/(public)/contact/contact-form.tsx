"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactFormData) {
    try {
      const res = await apiPost("/api/contact", data);
      const { message } = await handleApiFetch(res);
      toast.success(message ?? "Your message has been sent. We will respond within 2 business days.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            { name: "name", label: "Full Name", placeholder: "Your full name" },
            { name: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
            { name: "phone", label: "Phone Number", type: "tel", placeholder: "+91 XXXXX XXXXX" },
            { name: "subject", label: "Subject", placeholder: "How can we help?" },
            { name: "message", label: "Message", type: "textarea", placeholder: "Write your message here...", className: "sm:col-span-2" }
          ]}
        />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
