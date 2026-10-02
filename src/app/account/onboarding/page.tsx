import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { needsOnboarding } from "@/modules/account/member-home.server";
import { LogoImage } from "@/shared/components/ui/media-image";
import { siteConfig, siteImages } from "@/shared/config/site";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Complete your registration" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?callbackUrl=/account/onboarding");
  // Existing members (and admins) never see this step.
  const needsOnboard = await needsOnboarding(user).catch(() => false);
  if (!needsOnboard) redirect("/account/dashboard");

  const dbUser = user.id
    ? await prisma.user
        .findUnique({ where: { id: user.id }, select: { name: true, phone: true, email: true } })
        .catch(() => null)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={48} maxWidth={48} className="rounded-lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{siteConfig.shortName} Membership</p>
            <h1 className="text-2xl font-bold text-primary">Complete your registration</h1>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3 rounded-lg bg-primary/5 p-4 text-sm text-slate-700">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>Tell us which district you belong to. Your district association looks after your registration, tournaments and equipment.</p>
          </div>
          <OnboardingForm defaultName={dbUser?.name ?? ""} defaultPhone={dbUser?.phone ?? ""} email={dbUser?.email ?? user.email ?? ""} />
        </div>
      </div>
    </div>
  );
}
