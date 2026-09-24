import type { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Update your RRA account details.",
};

export default async function AccountProfilePage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { profile: true },
  });
  if (!user) redirect("/account/login");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">My Profile</h1>
        <p className="text-slate-500">Keep your contact and address details up to date.</p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={{
              name: user.name,
              email: user.email,
              phone: user.phone ?? "",
              dateOfBirth: user.profile?.dateOfBirth
                ? user.profile.dateOfBirth.toISOString().slice(0, 10)
                : "",
              gender: user.profile?.gender ?? "",
              address: user.profile?.address ?? "",
              city: user.profile?.city ?? "",
              state: user.profile?.state ?? "",
              country: user.profile?.country ?? "India",
              pincode: user.profile?.pincode ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
