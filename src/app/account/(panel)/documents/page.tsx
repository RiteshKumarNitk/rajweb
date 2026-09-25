import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Download, ExternalLink } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Documents & Certificates",
  description: "Official documents and certificates generated against your Rajasthan Racquetball Association account.",
};

export default async function AccountDocumentsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [player, coach] = await Promise.all([
    prisma.player.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { certificates: { where: { isRevoked: false, pdfPath: { not: null } } } },
    }),
    prisma.coach.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
      include: { certificates: { where: { isRevoked: false, pdfPath: { not: null } } } },
    }),
  ]);

  const storage = getStorage();
  const documents = [
    ...(player?.certificates ?? []).map((c) => ({
      id: c.id,
      title: `Official Player Certificate — ${c.certificateNumber}`,
      date: c.issuedAt,
      url: storage.getUrl(c.pdfPath!),
    })),
    ...(coach?.certificates ?? []).map((c) => ({
      id: c.id,
      title: `Official Coach Certificate — ${c.certificateNumber}`,
      date: c.issuedAt,
      url: storage.getUrl(c.pdfPath!),
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Documents</h1>
        <p className="text-sm text-slate-500">
          Official PDFs, certificates, and records generated against your RRA member account.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents generated yet"
              description="Official certificates and receipts will appear here automatically once issued by the association."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{doc.title}</p>
                      <p className="text-xs text-slate-400">Generated on {formatDate(doc.date)} · PDF Document</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
