import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { UserCog, Sparkles, CheckCircle2, ShieldCheck, Mail, MapPin, User, AlertCircle } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { ProfileForm } from "./profile-form";
import { calculateProfileCompletion } from "@/modules/account/profile-completion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Update your personal and contact details on Rajasthan Racquetball Association portal.",
};

export default async function AccountProfilePage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
    include: { profile: true, role: { select: { name: true } } },
  });

  const user = dbUser ?? {
    id: authUser.id,
    name: authUser.name || "Member",
    email: authUser.email ?? "",
    phone: null,
    avatar: null,
    role: { name: "Public User" },
    profile: null,
  };

  const completion = calculateProfileCompletion({
    name: user.name,
    phone: user.phone,
    profile: user.profile,
  });

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Profile</h1>
        <p className="text-sm text-slate-500">
          Manage your personal details, contact numbers, and residential address for state tournament eligibility.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full border-2 border-amber-400/60 object-cover shadow-md"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md">
                    {initial}
                  </div>
                )}
                <span
                  className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-500 shadow-xs"
                  title="Active"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold sm:text-xl">{user.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                    <Sparkles className="h-3 w-3" /> {user.role?.name ?? "RRA Member"}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5 rounded-xl bg-white/5 p-3 border border-white/10 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">Profile Completion:</span>
                <span className="text-sm font-bold text-amber-400">{completion.percent}%</span>
              </div>
              <div className="h-1.5 w-36 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Profile Form Card */}
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">Edit Personal & Address Details</CardTitle>
              <CardDescription>Ensure your legal full name and address match your official government ID.</CardDescription>
            </div>
          </div>
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
