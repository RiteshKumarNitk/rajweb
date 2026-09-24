"use client";

import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { EligiblePlayer, PlayerCertificateInfo } from "./issue-player-certificate-modal";

export function CertificateDetailsModal({
  player,
  onClose,
}: {
  player: EligiblePlayer & { certificate: PlayerCertificateInfo };
  onClose: () => void;
}) {
  const cert = player.certificate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Certificate Details</CardTitle>
            <p className="mt-1 text-sm text-slate-500">{player.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Player ID</span>
              <span className="font-mono text-xs font-medium">{player.playerId}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Certificate No.</span>
              <span className="font-mono text-xs font-medium">{cert.certificateNumber}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">QR Code</span>
              <span className="font-mono text-xs font-medium">{cert.qrCode}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">District</span>
              <span className="font-medium">{player.district}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Issued</span>
              <span>{formatDate(cert.issuedAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Valid Until</span>
              <span>{cert.expiresAt ? formatDate(cert.expiresAt) : "N/A"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/verify?certificateNumber=${encodeURIComponent(cert.certificateNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify Link
              </a>
            </Button>
            {cert.pdfUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer">
                  View PDF
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
