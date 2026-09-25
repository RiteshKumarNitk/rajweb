"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { OfficialStateCertificate } from "@/shared/components/certificates/official-state-certificate";
import type { CertificateVerificationResult } from "@/modules/verify/verify.types";
import { SAMPLE_CHAMPIONSHIP_CERTIFICATES } from "@/modules/verify/verify.types";

export function VerifyForm() {
  const searchParams = useSearchParams();
  const initialCert = searchParams.get("certificateNumber") || searchParams.get("qrCode") || "";

  const [searchMode, setSearchMode] = useState<"serial" | "details">("serial");
  const [serialNumber, setSerialNumber] = useState(initialCert);
  const [candidateName, setCandidateName] = useState("");
  const [district, setDistrict] = useState("");
  const [fatherName, setFatherName] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateVerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCert) {
      handleVerify(initialCert);
    }
  }, [initialCert]);

  async function handleVerify(queryOverride?: string) {
    const q = queryOverride !== undefined ? queryOverride : serialNumber;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      let res: Response;
      if (searchMode === "serial" || queryOverride) {
        const params = new URLSearchParams({ certificateNumber: q.trim() });
        res = await fetch(`/api/verify?${params.toString()}`);
      } else {
        res = await fetch(`/api/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: candidateName.trim(),
            district: district.trim() || undefined,
            fatherName: fatherName.trim() || undefined,
          }),
        });
      }

      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.valid) {
          setResult(json.data);
        } else {
          setErrorMsg(json.data.message || "No matching certificate found.");
        }
      } else {
        setErrorMsg(json.error?.message || "Verification failed. Please check your query.");
      }
    } catch {
      setErrorMsg("Verification service unavailable. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSample(sample: CertificateVerificationResult) {
    setSearchMode("serial");
    setSerialNumber(sample.certificateNumber);
    handleVerify(sample.certificateNumber);
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">State Certificate Authentication</CardTitle>
                <CardDescription className="text-xs">
                  Official verification system of Rajasthan Racquetball Association
                </CardDescription>
              </div>
            </div>

            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setSearchMode("serial")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  searchMode === "serial"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Serial No.
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("details")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  searchMode === "details"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Candidate Name
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {searchMode === "serial" ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Enter Serial No. (e.g. RRA/STC/2026/001 or PLR-2025-001)"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    className="pl-9 font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={() => handleVerify()}
                  disabled={loading || !serialNumber.trim()}
                  className="bg-primary text-white hover:bg-slate-800 shrink-0 font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" /> Verify Certificate
                    </>
                  )}
                </Button>
              </div>

              {/* Sample Testing Chips */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Test Data (Click to verify instantly):
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_CHAMPIONSHIP_CERTIFICATES.slice(0, 4).map((s) => (
                    <button
                      key={s.certificateNumber}
                      type="button"
                      onClick={() => handleSelectSample(s)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-900 transition-all font-mono"
                    >
                      <span className="font-bold text-slate-900">{s.certificateNumber}</span>
                      <span className="text-[11px] text-slate-500 font-sans">({s.name} - {s.position})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Candidate Full Name *</Label>
                  <Input
                    placeholder="e.g. Rohan Sharma"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">District</Label>
                  <Input
                    placeholder="e.g. Jaipur"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Father&apos;s Name</Label>
                  <Input
                    placeholder="e.g. Suresh Sharma"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={() => handleVerify()}
                disabled={loading || !candidateName.trim()}
                className="w-full bg-primary text-white hover:bg-slate-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Candidate...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Search & Verify Record
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {errorMsg && (
        <Card className="border-red-200 bg-red-50 text-red-800">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold">Verification Notice</p>
              <p className="text-xs text-red-700">{errorMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.valid && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <OfficialStateCertificate cert={result} printable={true} />
        </div>
      )}
    </div>
  );
}
