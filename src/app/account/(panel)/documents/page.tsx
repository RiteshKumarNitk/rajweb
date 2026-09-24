import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { getStorage } from "@/infrastructure/storage/storage-adapter";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Documents",
  description: "Documents generated against your RRA account.",
};

export default async function AccountDocumentsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [player, coach] = await Promise.all([
    prisma.player.findUnique({
      where: { userId: authUser.id },
      include: { certificates: { where: { isRevoked: false, pdfPath: { not: null } } } },
    }),
    prisma.coach.findUnique({
      where: { userId: authUser.id },
      include: { certificates: { where: { isRevoked: false, pdfPath: { not: null } } } },
    }),
  ]);

  const storage = getStorage();
  const documents = [
    ...(player?.certificates ?? []).map((c) => ({
      id: c.id,
      title: `Player Certificate — ${c.certificateNumber}`,
      date: c.issuedAt,
      url: storage.getUrl(c.pdfPath!),
    })),
    ...(coach?.certificates ?? []).map((c) => ({
      id: c.id,
      title: `Coach Certificate — ${c.certificateNumber}`,
      date: c.issuedAt,
      url: storage.getUrl(c.pdfPath!),
    })),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">My Documents</h1>
        <p className="text-slate-500">Certificates and other documents generated against your account.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Certificates and other generated documents will appear here once issued."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <p className="text-sm font-medium text-primary">{doc.title}</p>
                      <p className="text-xs text-slate-400">Generated {formatDate(doc.date)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
