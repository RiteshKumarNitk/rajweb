import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import type { OwnCertificate } from "@/modules/certificates/own-certificates.server";

function status(c: OwnCertificate) {
  if (c.isRevoked) return { status: "REJECTED", label: "Revoked" };
  if (c.expiresAt && c.expiresAt < new Date()) return { status: "EXPIRED", label: "Expired" };
  return { status: "APPROVED", label: "Issued" };
}

/**
 * The member's certificate collection: what was issued, for which tournament,
 * when — with View Certificate and Download PDF. Read-only: no edit, delete
 * or self-verification actions.
 */
export function CertificateCollection({ certificates }: { certificates: OwnCertificate[] }) {
  if (certificates.length === 0) {
    return (
      <EmptyState
        title="No certificates have been issued to you yet."
        description="Certificates appear here automatically once the association issues them — for your registration or for tournaments you took part in."
      />
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="my-certificates">
      {certificates.map((c) => {
        const s = status(c);
        return (
          <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs" data-certificate={c.certificateNumber}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-bold text-primary">{c.tournamentName ?? c.typeLabel}</p>
                <p className="text-sm text-slate-600">{c.title}</p>
              </div>
              <StatusBadge status={s.status} label={s.label} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="col-span-2">
                <dt className="text-slate-500">Certificate No</dt>
                <dd className="font-mono font-semibold text-slate-900">{c.certificateNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="font-semibold text-slate-900">{c.typeLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Issued</dt>
                <dd className="font-semibold text-slate-900">{formatDate(c.issuedAt)}</dd>
              </div>
              {c.position && (
                <div className="col-span-2">
                  <dt className="text-slate-500">Achievement</dt>
                  <dd className="font-semibold text-slate-900">{c.position}</dd>
                </div>
              )}
            </dl>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {c.viewUrl && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={c.viewUrl}>
                    <Eye className="h-3.5 w-3.5" /> View Certificate
                  </Link>
                </Button>
              )}
              {c.downloadUrl ? (
                <Button size="sm" asChild>
                  <a href={c.downloadUrl}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </a>
                </Button>
              ) : (
                <span className="self-center text-xs text-slate-400">{c.isRevoked ? "Revoked — no download" : "PDF not available"}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
