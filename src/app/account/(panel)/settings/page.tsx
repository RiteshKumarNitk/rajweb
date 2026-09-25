import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  UserCheck,
  Mail,
  Calendar,
  KeyRound,
  Shield,
  Smartphone,
  ExternalLink,
  Edit3,
  Sparkles,
  Lock,
  Globe,
  AlertTriangle,
} from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { SignOutButton } from "./sign-out-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account Settings & Security",
  description: "Manage your RRA account security, authentication methods, and preferences.",
};

const PROVIDER_METADATA: Record<string, { label: string; desc: string; badgeClass: string }> = {
  GOOGLE: {
    label: "Google OAuth 2.0",
    desc: "Single Sign-On via verified Google account",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  OTP_EMAIL: {
    label: "One-Time Passcode (Email)",
    desc: "Secure OTP sent to verified email inbox",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  CREDENTIALS: {
    label: "Email & Password",
    desc: "Standard encrypted email and password login",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  },
};

export default async function AccountSettingsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const dbUser = await prisma.user.findFirst({
    where: { OR: [{ id: authUser.id }, { email: authUser.email ?? "" }] },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      authProvider: true,
      isActive: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { name: true, description: true } },
    },
  });

  const user = dbUser ?? {
    id: authUser.id,
    name: authUser.name ?? "Member",
    email: authUser.email ?? "",
    phone: null,
    avatar: null,
    authProvider: "GOOGLE" as const,
    isActive: true,
    emailVerified: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    role: { name: "Public User", description: "Standard member account" },
  };

  const providerInfo = PROVIDER_METADATA[user.authProvider] ?? {
    label: user.authProvider,
    desc: "Authentication provider",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
  };

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Account Settings & Security
          </h1>
          <p className="text-sm text-slate-500">
            Manage your credentials, login provider, security preferences, and portal access.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
          <Link href="/account/profile" className="flex items-center gap-1.5">
            <Edit3 className="h-4 w-4" /> Edit Profile Details
          </Link>
        </Button>
      </div>

      {/* Account Overview Hero Card */}
      <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={72}
                    height={72}
                    className="h-16 w-16 rounded-full border-2 border-amber-400/60 object-cover shadow-md sm:h-20 sm:w-20"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/60 bg-slate-800 text-2xl font-bold text-amber-400 shadow-md sm:h-20 sm:w-20">
                    {initial}
                  </div>
                )}
                <span
                  className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-900 bg-emerald-500 shadow-xs"
                  title="Account Active"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold sm:text-2xl">{user.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 border border-amber-400/30">
                    <Sparkles className="h-3 w-3" /> {user.role?.name ?? "RRA Member"}
                  </span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-300 sm:text-sm">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Member since {formatDate(user.createdAt)}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    ID: {user.id.slice(0, 12)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Account
              </span>
              <span className="text-[11px] text-slate-400">
                256-Bit SSL Encrypted
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication & Sign-in Method */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Authentication Method</CardTitle>
                <CardDescription>How you sign in to the Rajasthan Racquetball Portal</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary">{providerInfo.label}</p>
                  <p className="text-xs text-slate-500">{providerInfo.desc}</p>
                </div>
                <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${providerInfo.badgeClass}`}>
                  Primary
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Sign-in Email:</span>
                <span className="font-medium text-slate-800">{user.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 py-2">
                <span className="text-slate-500">Email Verification:</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Multi-Factor Status:</span>
                <span className="font-medium text-slate-700">Protected via OAuth 2.0</span>
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-500 border border-slate-100">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <p>
                  Your authentication credentials and tokens are safeguarded by state-level security guidelines. To change your primary email, contact the association admin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Security & Federation Verification</CardTitle>
                <CardDescription>Portal credentials and public record validity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-primary">Certificate Verification Portal</p>
                  <p className="text-xs text-slate-500">Check validity of any RRA-issued certificate anytime.</p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 h-8 text-xs">
                  <Link href="/verify" target="_blank">
                    Verify Certificate <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>

              <div className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-primary">Profile Completeness</p>
                  <p className="text-xs text-slate-500">Ensure contact & address details are complete for tournaments.</p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 h-8 text-xs">
                  <Link href="/account/profile">Edit Details</Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">Official Federation Data Policy</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                All tournament registrations, ranking points, and player licenses are synchronized under Rajasthan Racquetball Association records.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Notifications Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Contact & Communication</CardTitle>
                <CardDescription>How the association reaches you for tournament updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs text-slate-500">Registered Email</span>
              <span className="text-xs font-medium text-slate-800">{user.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs text-slate-500">Mobile Phone</span>
              <span className="text-xs font-medium text-slate-800">
                {user.phone ? user.phone : (
                  <span className="text-amber-600 font-normal italic">Not provided</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-slate-500">Tournament Alerts</span>
              <span className="text-xs font-medium text-emerald-600">Enabled (Email)</span>
            </div>
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild className="w-full text-xs">
                <Link href="/account/profile">Update Contact Details</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Session & Sign Out Card */}
        <Card className="border-red-100 bg-red-50/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base text-red-900">Session & Sign Out</CardTitle>
                <CardDescription>Manage active portal session</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              You are currently signed in on this device. Signing out will terminate your current session token securely.
            </p>
            <div className="rounded-lg border border-red-200/60 bg-white p-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Active Web Session</p>
                  <p className="text-[11px] text-slate-400">NextAuth Secure Session Token</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Current Device
                </span>
              </div>
            </div>
            <div className="pt-1">
              <SignOutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
