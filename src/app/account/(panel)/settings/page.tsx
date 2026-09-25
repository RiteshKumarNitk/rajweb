import type { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { SignOutButton } from "./sign-out-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Settings",
  description: "Your RRA account settings.",
};

const PROVIDER_LABELS: Record<string, string> = {
  CREDENTIALS: "Email & Password",
  GOOGLE: "Google",
  OTP_EMAIL: "Email (One-Time Code)",
};

export default async function AccountSettingsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
    select: { email: true, authProvider: true, isActive: true, createdAt: true },
  });

  const user = dbUser ?? {
    email: authUser.email ?? "",
    authProvider: "GOOGLE" as const,
    isActive: true,
    createdAt: new Date(),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Account Settings</h1>
        <p className="text-slate-500">Basic information about your RRA account.</p>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Login Method</span>
            <span className="font-medium">{PROVIDER_LABELS[user.authProvider] ?? user.authProvider}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-slate-500">Account Status</span>
            <StatusBadge status={user.isActive ? "ACTIVE" : "SUSPENDED"} />
          </div>
          <div className="flex items-center justify-between pb-1">
            <span className="text-slate-500">Member Since</span>
            <span className="font-medium">{formatDate(user.createdAt)}</span>
          </div>
          <div className="pt-4">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
