"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { apiFetch, handleApiFetch } from "@/lib/api-client";
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
  Configuration: "Authentication server configuration error. Please verify Google OAuth setup (Client ID, Secret, or Redirect URI).",
  AccessDenied: "Access was denied during sign-in. Please try again.",
  OAuthSignin: "Could not initiate Google sign-in. Please try again.",
  OAuthCallbackError: "Google authentication callback failed. Please try again.",
  OAuthAccountNotLinked: "This email is already associated with another login provider.",
  Callback: "Error completing authentication callback.",
  Default: "Sign-in failed. Please try again.",
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

  useEffect(() => {
    if (googleError) {
      console.error("[AccountLogin] NextAuth returned error in URL:", googleError);
    }
  }, [googleError]);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    console.log("[AccountLogin] Initiating Google sign-in...");
    try {
      const callback = accountCallbackUrl(searchParams.get("callbackUrl"));
      console.log("[AccountLogin] Using callback URL:", callback);
      await signIn("google", { callbackUrl: callback });
    } catch (err) {
      console.error("[AccountLogin] Google sign-in caught error:", err);
      setError(err instanceof Error ? err.message : "Failed to initiate Google sign-in.");
      setGoogleLoading(false);
    }
  }

  async function onRequestOtp(data: EmailForm) {
    setError("");
    console.log("[AccountLogin] Requesting OTP for:", data.email);
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
      console.error("[AccountLogin] OTP request error:", err);
      setError(err instanceof Error ? err.message : "Failed to send code");
    }
  }

  async function onVerifyOtp(data: OtpForm) {
    setError("");
    console.log("[AccountLogin] Verifying OTP for:", email);
    try {
      const result = await signIn("email-otp", {
        email,
        otp: data.otp,
        redirect: false,
      });

      console.log("[AccountLogin] Verify OTP result:", result);

      if (result?.error) {
        console.error("[AccountLogin] Verify OTP error:", result.error);
        setError("Incorrect or expired code. Please try again.");
        return;
      }

      router.push(accountCallbackUrl(searchParams.get("callbackUrl")));
      router.refresh();
    } catch (err) {
      console.error("[AccountLogin] Verify OTP exception:", err);
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    }
  }

  const displayedError = error || (googleError ? (GOOGLE_ERROR_MESSAGES[googleError] ?? `Sign-in failed (${googleError}). Please try again.`) : null);

  return (
    <div className="space-y-6">
      {displayedError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div>
            <p className="font-medium">{displayedError}</p>
            {googleError && (
              <p className="mt-1 text-xs text-red-600">Error code: {googleError}</p>
            )}
          </div>
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
