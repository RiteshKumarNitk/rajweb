"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { toast } from "sonner";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type EmailForm = z.infer<typeof emailSchema>;

const otpSchema = z.object({
  otp: z.string().min(6, "Enter the 6-digit code").max(6, "Enter the 6-digit code"),
});
type OtpForm = z.infer<typeof otpSchema>;

function accountCallbackUrl(value: string | null): string {
  if (value && value.startsWith("/account/") && !value.startsWith("//")) return value;
  return "/account/dashboard";
}

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  account_exists_with_password: "This email is already registered with a password-based account. Sign in from the Admin Login page instead.",
  inactive: "This account is inactive. Contact RRA support for help.",
  missing_email: "Google did not share an email address. Try a different Google account.",
};

export function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });

  async function handleGoogleSignIn() {
    if (blockSubmitForStaticRelease("Continue with Google")) return;
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: accountCallbackUrl(searchParams.get("callbackUrl")) });
  }

  async function onRequestOtp(data: EmailForm) {
    if (blockSubmitForStaticRelease("Gmail sign-in")) return;
    setError("");
    try {
      const res = await apiFetch("/api/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ email: data.email }),
      });
      await handleApiFetch(res);
      setEmail(data.email);
      setStep("otp");
      toast.success("If that email can receive a code, we've sent it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    }
  }

  async function onVerifyOtp(data: OtpForm) {
    setError("");
    const result = await signIn("email-otp", {
      email,
      otp: data.otp,
      redirect: false,
    });

    if (result?.error) {
      setError("Incorrect or expired code. Please try again.");
      return;
    }

    router.push(accountCallbackUrl(searchParams.get("callbackUrl")));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ComingSoonBanner feature="Account login" />

      {googleError && (
        <div className="rounded-md bg-secondary/10 px-4 py-3 text-sm text-secondary">
          {GOOGLE_ERROR_MESSAGES[googleError] ?? "Sign-in failed. Please try again."}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
      >
        {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Continue with Google
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wide text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {step === "email" ? (
        <form onSubmit={emailForm.handleSubmit(onRequestOtp)} className="space-y-4">
          <FormBuilder
            register={emailForm.register}
            errors={emailForm.formState.errors}
            fields={[{ name: "email", label: "Email address", type: "email", placeholder: "you@example.com" }]}
          />
          {error && <p className="text-sm text-secondary">{error}</p>}
          <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Continue with Gmail
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
          <p className="text-sm text-slate-500">
            Enter the 6-digit code sent to <span className="font-medium text-primary">{email}</span>.
          </p>
          <FormBuilder
            register={otpForm.register}
            errors={otpForm.formState.errors}
            fields={[{ name: "otp", label: "Verification code", type: "text", placeholder: "123456" }]}
          />
          {error && <p className="text-sm text-secondary">{error}</p>}
          <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
            {otpForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Sign In"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-slate-500 hover:text-primary"
            onClick={() => setStep("email")}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
