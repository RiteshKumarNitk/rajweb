"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Shield, MapPin, Trophy, Newspaper, UserCog } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { LogoImage } from "@/shared/components/ui/media-image";
import { siteConfig, siteImages } from "@/shared/config/site";
import type { QuickLoginAccount } from "@/modules/auth/dev-quick-login.server";
import { quickLogin } from "./actions";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_ICONS: Record<string, typeof Shield> = {
  "super-admin": Shield,
  "state-admin": MapPin,
  "district-admin": MapPin,
  "tournament-manager": Trophy,
  "content-manager": Newspaper,
};

/** Only same-site paths — never an absolute or protocol-relative URL (open redirect). */
function safeCallbackUrl(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/admin";
}

export function LoginForm({ quickAccounts }: { quickAccounts: QuickLoginAccount[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState("");
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  // While the provider's own session fetch is in flight, its response would
  // re-issue the current cookie and could overwrite a quick-login switch.
  const { status: sessionStatus } = useSession();
  const sessionSettling = sessionStatus === "loading";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setError("");
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleQuickLogin(account: QuickLoginAccount) {
    setError("");
    setQuickLoading(account.email);
    // A rate-limited (429) or failed request rejects instead of returning.
    const result = await quickLogin(account.email).catch(() => ({
      error: "Sign-in request failed — wait a minute and try again.",
    }));
    if (result.error) {
      setError(result.error);
      setQuickLoading(null);
      return;
    }
    // Full load so every session consumer picks up the switched account.
    window.location.assign(callbackUrl);
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

          {quickAccounts.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                Quick login
              </p>
              <div className="space-y-2">
                {quickAccounts.map((account) => {
                  const Icon = ROLE_ICONS[account.role] ?? UserCog;
                  return (
                    <Button
                      key={account.email}
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start px-4 py-3"
                      disabled={isSubmitting || !!quickLoading || sessionSettling}
                      onClick={() => handleQuickLogin(account)}
                    >
                      <Icon className="mr-3 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-left">
                        <span className="block text-sm font-medium">{account.label}</span>
                        <span className="block text-xs text-slate-500">{account.description}</span>
                      </span>
                      {quickLoading === account.email && (
                        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
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
