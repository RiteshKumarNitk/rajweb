"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { FormBuilder } from "@/shared/components/ui/form-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { ApiResponse } from "@/lib/api-client";
import { blockSubmitForStaticRelease } from "@/shared/lib/static-release";
import { ComingSoonBanner } from "@/shared/components/ui/coming-soon-banner";

const verifySchema = z
  .object({
    certificateNumber: z.string(),
    qrCode: z.string(),
  })
  .superRefine((data, ctx) => {
    const cert = data.certificateNumber.trim();
    const qr = data.qrCode.trim();

    if (!cert && !qr) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a certificate number or QR code",
        path: ["certificateNumber"],
      });
      return;
    }

    if (cert && cert.length < 6) {
      ctx.addIssue({
        code: "custom",
        message: "Certificate number must be at least 6 characters",
        path: ["certificateNumber"],
      });
    }

    if (qr && qr.length < 4) {
      ctx.addIssue({
        code: "custom",
        message: "QR code must be at least 4 characters",
        path: ["qrCode"],
      });
    }
  });

type VerifyFormData = z.infer<typeof verifySchema>;

type VerifyData = {
  valid: boolean;
  message?: string;
  name?: string;
  type?: "player" | "coach";
  issuedAt?: string;
  expiresAt?: string | null;
  district?: string;
};

export function VerifyForm() {
  const [result, setResult] = useState<VerifyData | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  });

  async function onSubmit(data: VerifyFormData) {
    if (blockSubmitForStaticRelease("Certificate verification")) return;
    setResult(null);
    const params = new URLSearchParams();
    const cert = data.certificateNumber.trim();
    const qr = data.qrCode.trim();
    if (cert) params.set("certificateNumber", cert);
    if (qr) params.set("qrCode", qr);

    try {
      const res = await fetch(`/api/verify?${params.toString()}`);
      const json = (await res.json()) as ApiResponse<VerifyData>;

      if (!res.ok || !json.success) {
        setResult({
          valid: false,
          message: json.error?.message ?? "Verification failed.",
        });
        return;
      }

      const data = json.data;
      if (data?.valid) {
        setResult({
          valid: true,
          message: "Certificate verified successfully.",
          name: data.name,
          type: data.type,
          issuedAt: data.issuedAt,
          expiresAt: data.expiresAt,
          district: data.district,
        });
      } else {
        setResult({
          valid: false,
          message: data?.message ?? "No matching certificate found.",
        });
      }
    } catch {
      setResult({ valid: false, message: "Verification service unavailable. Please try again later." });
    }
  }

  return (
    <div className="space-y-6">
      <ComingSoonBanner feature="Certificate verification" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormBuilder
          register={register}
          errors={errors}
          fields={[
            {
              name: "certificateNumber",
              label: "Certificate / Player / Coach ID",
              placeholder: "e.g. RRA-2025-PLR001 or PLR-TEST-001",
            },
            {
              name: "qrCode",
              label: "QR Code (optional)",
              placeholder: "Scan or enter QR code",
            },
          ]}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Verifying..." : "Verify Certificate"}
        </Button>
      </form>

      {result && (
        <Card className={result.valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {result.valid ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <CardTitle className={result.valid ? "text-green-800" : "text-red-800"}>
                {result.valid ? "Valid Certificate" : "Verification Failed"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className={result.valid ? "text-green-700" : "text-red-700"}>{result.message}</p>
            {result.valid && result.name && (
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-medium text-green-800">Name</dt><dd className="text-green-700">{result.name}</dd></div>
                <div><dt className="font-medium text-green-800">Type</dt><dd className="text-green-700">{result.type === "player" ? "Player Certificate" : "Coach Certificate"}</dd></div>
                <div><dt className="font-medium text-green-800">Issued</dt><dd className="text-green-700">{result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("en-IN") : "N/A"}</dd></div>
                <div><dt className="font-medium text-green-800">Expires</dt><dd className="text-green-700">{result.expiresAt ? new Date(result.expiresAt).toLocaleDateString("en-IN") : "N/A"}</dd></div>
                <div><dt className="font-medium text-green-800">District</dt><dd className="text-green-700">{result.district}</dd></div>
              </dl>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
