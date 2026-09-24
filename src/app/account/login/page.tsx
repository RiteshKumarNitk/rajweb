import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { BackButton } from "./back-button";
import { AccountLoginForm } from "./account-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login / Sign Up",
  description: "Sign in or create an RRA account with Google or your Gmail address.",
};

export default async function AccountLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/dashboard");

  return (
    <div className="flex h-screen w-screen bg-primary">
      {/* Left panel — image, hidden on small screens */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <BackButton />
        <Image
          src="/images/rra/action-court-01.jpg"
          alt="Rajasthan Racquetball Association"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">RRA Platform</p>
          <p className="mt-2 text-2xl font-bold">Rajasthan Racquetball Association</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-2 lg:hidden">
            <BackButton inline />
          </div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-primary">Login / Sign Up</h1>
            <p className="mt-2 text-slate-500">
              Sign in with Google, or use your email to get a one-time code — no password needed.
            </p>
          </div>
          <Suspense>
            <AccountLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
