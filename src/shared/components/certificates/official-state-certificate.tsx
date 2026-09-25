"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { CertificateVerificationResult } from "@/modules/verify/verify.types";

export function OfficialStateCertificate({
  cert,
  printable = true,
}: {
  cert: CertificateVerificationResult;
  printable?: boolean;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const url = `${window.location.origin}/verify?certificateNumber=${encodeURIComponent(cert.certificateNumber)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Action Controls Bar */}
      {printable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Officially Verified Record
            </span>
            <span className="hidden font-mono text-xs text-slate-500 sm:inline">
              SN: {cert.certificateNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="text-xs h-8"
            >
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              {copied ? "Link Copied!" : "Share Link"}
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-primary text-white hover:bg-slate-800 text-xs h-8"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      )}

      {/* Official Certificate Visual Template */}
      <div
        ref={printRef}
        id="official-certificate-container"
        className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border-8 border-pink-700/80 bg-gradient-to-b from-[#FFFDF9] via-[#FFFFFF] to-[#FFFDF9] p-6 text-slate-900 shadow-xl sm:p-10"
        style={{
          backgroundImage: `radial-gradient(ellipse at center, rgba(244, 63, 94, 0.03) 0%, rgba(255, 255, 255, 0.98) 70%), repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(225, 29, 72, 0.02) 41px, rgba(225, 29, 72, 0.02) 43px)`,
        }}
      >
        {/* Inner Guilloche Border Accent */}
        <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-dashed border-pink-400/40" />
        <div className="pointer-events-none absolute inset-3 rounded-lg border border-pink-300/30" />

        {/* Top Federation Logos Row */}
        <div className="relative z-10 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-pink-200/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="text-center">
              <span className="block text-[11px] font-black uppercase tracking-tight text-slate-800">
                Indian
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-widest text-red-600">
                Racquetball
              </span>
            </div>
            <div className="h-6 w-px bg-slate-300" />
            <div className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-black text-sky-800 border border-sky-200">
              IRF
            </div>
            <div className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-200">
              ARF
            </div>
          </div>

          {/* Central Pink Rajasthan Emblem */}
          <div className="flex flex-col items-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 p-1.5 text-white shadow-md">
              <Award className="h-8 w-8 text-amber-300 drop-shadow" />
            </div>
            <span className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-pink-700">
              Rajasthan Racquetball
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="block text-[10px] font-bold text-slate-700">
                Recognized By
              </span>
              <span className="block text-[9px] font-semibold text-pink-600">
                Olympic & World Games
              </span>
            </div>
          </div>
        </div>

        {/* Championship Titles */}
        <div className="relative z-10 text-center space-y-1">
          <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight text-pink-700 drop-shadow-xs">
            {cert.championshipName}
          </h2>
          <p className="text-xs font-bold text-slate-800">
            organized by:{" "}
            <span className="text-pink-700 font-extrabold">{cert.organizedBy}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] text-slate-600 font-medium">
            <span>Recognized by: Rajasthan Racquetball Association</span>
            <span>·</span>
            <span>Indian Racquetball Association</span>
            <span>·</span>
            <span>International Racquetball Federation</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700 pt-1">
            <span>
              Venue: <span className="text-slate-900 font-bold">{cert.venue || "Sawai Mansingh Stadium, Jaipur"}</span>
            </span>
            <span>·</span>
            <span>
              Date: <span className="text-slate-900 font-bold">{formatDate(cert.issuedAt)}</span>
            </span>
          </div>
        </div>

        {/* Certificate Heading & S.No Row */}
        <div className="relative z-10 mt-6 flex items-center justify-between border-t border-b border-pink-200/80 py-3">
          <div className="flex items-center gap-3">
            {/* QR Code Graphic Box */}
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-slate-800 bg-white p-1 shadow-xs">
              <div className="grid grid-cols-4 gap-0.5 w-full h-full p-0.5 bg-slate-900 rounded-xs">
                <div className="bg-white rounded-[1px] col-span-2 row-span-2 m-0.5"></div>
                <div className="bg-white rounded-[1px] col-span-2"></div>
                <div className="bg-white rounded-[1px] col-span-2"></div>
                <div className="bg-white rounded-[1px] col-span-2 row-span-2 m-0.5"></div>
                <div className="bg-white rounded-[1px] col-span-2"></div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Official Serial No.
              </p>
              <p className="font-mono text-sm sm:text-base font-black text-pink-700">
                {cert.certificateNumber}
              </p>
            </div>
          </div>

          <div className="text-right">
            <h1 className="font-serif text-3xl sm:text-4xl font-black uppercase tracking-wider text-slate-900">
              CERTIFICATE
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Official Merit & Participation
            </p>
          </div>
        </div>

        {/* Certificate Recipient Information Body */}
        <div className="relative z-10 my-6 space-y-4 text-center font-serif text-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-center gap-2 border-b border-dotted border-slate-400 pb-2">
            <span className="text-sm font-sans font-medium text-slate-500">This is to certify that Mr./Ms.</span>
            <span className="font-sans text-xl sm:text-2xl font-black text-pink-700 underline decoration-pink-500 decoration-2 underline-offset-4">
              {cert.name}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-center gap-2 border-b border-dotted border-slate-400 pb-2">
            <span className="text-sm font-sans font-medium text-slate-500">Son / Daughter of</span>
            <span className="font-sans text-base sm:text-lg font-bold text-slate-800">
              {cert.fatherName || "Official Registered Guardian"}
            </span>
            <span className="text-sm font-sans font-medium text-slate-500">has participated from District</span>
            <span className="font-sans text-base sm:text-lg font-bold text-pink-700">
              {cert.district}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl bg-pink-50/50 p-3.5 text-left font-sans text-xs border border-pink-100">
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">
                Age / Skill Category
              </span>
              <span className="text-sm font-bold text-slate-900">
                {cert.category}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase text-slate-500">
                Championship Event
              </span>
              <span className="text-sm font-bold text-slate-900">
                {cert.event}
              </span>
            </div>
          </div>

          {/* Position Banner */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 px-6 py-2 text-white shadow-md border-2 border-white">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-black uppercase tracking-wider">
                POSITION SECURED: {cert.position}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Official Signatures */}
        <div className="relative z-10 mt-8 border-t-2 border-slate-800 pt-6">
          <div className="grid grid-cols-3 items-end gap-4 text-center font-sans">
            {/* President Signature */}
            <div className="space-y-1">
              <div className="mx-auto h-10 w-28 flex items-center justify-center font-serif italic text-base text-pink-800 font-bold border-b border-slate-400">
                Aamir Khan
              </div>
              <p className="text-xs font-black text-slate-900 uppercase">
                {cert.signatories.president.name}
              </p>
              <p className="text-[11px] font-bold text-pink-700">
                {cert.signatories.president.title}
              </p>
              <p className="text-[9px] text-slate-500">
                {cert.signatories.president.organization}
              </p>
            </div>

            {/* Central Racquetball Symbol */}
            <div className="flex flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm border-2 border-amber-400">
                <Award className="h-6 w-6 text-amber-400" />
              </div>
              <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-900">
                RACQUETBALL
              </span>
              <span className="text-[8px] font-semibold text-emerald-600 uppercase">
                Digitally Authenticated
              </span>
            </div>

            {/* General Secretary Signature */}
            <div className="space-y-1">
              <div className="mx-auto h-10 w-28 flex items-center justify-center font-serif italic text-base text-pink-800 font-bold border-b border-slate-400">
                Aashish Poonia
              </div>
              <p className="text-xs font-black text-slate-900 uppercase">
                {cert.signatories.generalSecretary.name}
              </p>
              <p className="text-[11px] font-bold text-pink-700">
                {cert.signatories.generalSecretary.title}
              </p>
              <p className="text-[9px] text-slate-500">
                {cert.signatories.generalSecretary.organization}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
