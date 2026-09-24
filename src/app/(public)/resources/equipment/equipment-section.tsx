"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MediaImage } from "@/shared/components/ui/media-image";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { rajasthanDistricts } from "@/shared/config/site";
import { apiPost, handleApiFetch } from "@/lib/api-client";

const orderSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "Please enter a valid mobile number"),
  address: z.string().min(10, "Please enter your full address"),
  district: z.string().min(1, "Please select a district"),
  equipment: z.string().min(2),
});

type OrderFormData = z.infer<typeof orderSchema>;

type EquipmentItem = {
  title: string;
  image: string;
  description: string;
  details: string[];
};

function BuyOrderModal({
  equipment,
  open,
  onClose,
}: {
  equipment: string;
  open: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        name: "",
        mobile: "",
        address: "",
        district: "",
        equipment,
      });
    }
  }, [equipment, open, reset]);

  if (!open) return null;

  async function onSubmit(data: OrderFormData) {
    try {
      const response = await apiPost("/api/equipment/orders", data);
      const { message } = await handleApiFetch(response);
      toast.success(message ?? "Thank you! Our admin team will contact you shortly.");
      reset({ name: "", mobile: "", address: "", district: "", equipment });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit order");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close order form"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-primary">Buy Equipment</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fill in your details and our team will contact you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment</Label>
            <Input id="equipment" readOnly {...register("equipment")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your full name" {...register("name")} />
            {errors.name && <p className="text-sm text-secondary">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input id="mobile" type="tel" placeholder="+91 XXXXX XXXXX" {...register("mobile")} />
            {errors.mobile && <p className="text-sm text-secondary">{errors.mobile.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" placeholder="Your complete address" {...register("address")} />
            {errors.address && <p className="text-sm text-secondary">{errors.address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">District</Label>
            <select
              id="district"
              {...register("district")}
              className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Select district</option>
              {rajasthanDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {errors.district && <p className="text-sm text-secondary">{errors.district.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Submitting..." : "Submit Order"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EquipmentSection({ items }: { items: EquipmentItem[] }) {
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-3">
        {items.map(({ title, image, description, details }) => (
          <Card key={title} className="flex flex-col overflow-hidden">
            <MediaImage src={image} alt={title} aspect="square" fit="contain" rounded={false} />
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <p className="text-sm text-slate-600">{description}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="mb-6 space-y-2">
                {details.map((detail) => (
                  <li key={detail} className="flex gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                    {detail}
                  </li>
                ))}
              </ul>
              <Button className="mt-auto w-full" onClick={() => setSelectedEquipment(title)}>
                Buy Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <BuyOrderModal
        equipment={selectedEquipment ?? ""}
        open={selectedEquipment !== null}
        onClose={() => setSelectedEquipment(null)}
      />
    </>
  );
}
