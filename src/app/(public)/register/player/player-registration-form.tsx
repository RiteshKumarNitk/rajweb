"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { rajasthanDistricts } from "@/shared/config/site";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const playerSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Please select gender"),
  district: z.string().min(1, "Please select a district"),
  category: z.string().min(1, "Please select a category"),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export function PlayerRegistrationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
  });

  async function onSubmit(data: PlayerFormData) {
    if (blockSubmitForStaticRelease("Player registration")) return;
    try {
      const response = await apiPost("/api/players/register", {
          name: `${data.firstName} ${data.lastName}`,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender.toUpperCase(),
          email: data.email,
          mobile: data.phone,
          district: data.district,
          category: data.category,
        });
      const { data: payload, message } = await handleApiFetch<{ playerId: string }>(response);
      toast.success(message ?? `Registration submitted! Player ID: ${payload.playerId}`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <ComingSoonBanner feature="Player registration" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" placeholder="First name" {...register("firstName")} />
          {errors.firstName && <p className="text-sm text-secondary">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" placeholder="Last name" {...register("lastName")} />
          {errors.lastName && <p className="text-sm text-secondary">{errors.lastName.message}</p>}
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="player@example.com" {...register("email")} />
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
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth && <p className="text-sm text-secondary">{errors.dateOfBirth.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <select
            id="gender"
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("gender")}
            defaultValue=""
          >
            <option value="" disabled>Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {errors.gender && <p className="text-sm text-secondary">{errors.gender.message}</p>}
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
          <Label htmlFor="category">Playing Category</Label>
          <select
            id="category"
            className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("category")}
            defaultValue=""
          >
            <option value="" disabled>Select category</option>
            <option value="Sub-Junior">Sub-Junior</option>
            <option value="Junior">Junior</option>
            <option value="Senior">Senior</option>
            <option value="Master">Master</option>
          </select>
          {errors.category && <p className="text-sm text-secondary">{errors.category.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Registering..." : "Register as Player"}
      </Button>
    </form>
  );
}
