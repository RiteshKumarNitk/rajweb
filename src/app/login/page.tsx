"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { LogoImage } from "@/shared/components/ui/media-image";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { siteConfig, siteImages } from "@/shared/config/site";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const demoAccounts = [
  {
    label: "Super Admin",
    description: "Full federation access",
    email: "admin@rajasthanracquetball.com",
    password: "Admin@123",
    icon: Shield,
  },
  {
    label: "District Admin",
    description: "Jaipur district only",
    email: "district.jaipur@rajasthanracquetball.com",
    password: "District@123",
    icon: MapPin,
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const [error, setError] = useState("");
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function loginWithCredentials(email: string, password: string) {
    if (blockSubmitForStaticRelease("Admin portal login")) return false;
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      return false;
    }

    router.push(callbackUrl);
    router.refresh();
    return true;
  }

  async function onSubmit(data: LoginForm) {
    await loginWithCredentials(data.email, data.password);
  }

  async function handleQuickLogin(account: (typeof demoAccounts)[0]) {
    setQuickLoading(account.email);
    setValue("email", account.email);
    setValue("password", account.password);
    await loginWithCredentials(account.email, account.password);
    setQuickLoading(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={64} maxWidth={64} className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-primary">{siteConfig.shortName} Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to access the admin dashboard</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <ComingSoonBanner feature="Admin portal login" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormBuilder
              register={register}
              errors={errors}
              fields={[
                { name: "email", label: "Email", type: "email", placeholder: "admin@rajasthanracquetball.com" },
                { name: "password", label: "Password", type: "password", placeholder: "••••••••" }
              ]}
            />
            {error && (
              <div className="rounded-md bg-secondary/10 px-4 py-3 text-sm text-secondary">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || !!quickLoading}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
              Quick login
            </p>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start px-4 py-3"
                  disabled={isSubmitting || !!quickLoading}
                  onClick={() => handleQuickLogin(account)}
                >
                  <account.icon className="mr-3 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-left">
                    <span className="block text-sm font-medium">{account.label}</span>
                    <span className="block text-xs text-slate-500">{account.description}</span>
                  </span>
                  {quickLoading === account.email && (
                    <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-primary hover:underline">
            ← Back to website
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
