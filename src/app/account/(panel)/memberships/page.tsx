import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Memberships",
  description: "Manage your club, school, and academy membership applications.",
};

export default async function AccountMembershipsIndexPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [club, school, academy] = await Promise.all([
    prisma.clubMembership.findUnique({ where: { userId: authUser.id } }),
    prisma.schoolMembership.findUnique({ where: { userId: authUser.id } }),
    prisma.academyMembership.findUnique({ where: { userId: authUser.id } }),
  ]);

  const items = [
    { type: "Club Membership", href: "/account/memberships/club", record: club, name: club?.clubName },
    { type: "School Membership", href: "/account/memberships/school", record: school, name: school?.schoolName },
    { type: "Academy Membership", href: "/account/memberships/academy", record: academy, name: academy?.academyName },
  ] satisfies { type: string; href: string; record: { status: string; rejectionReason: string | null } | null; name: string | undefined }[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Memberships</h1>
        <p className="text-slate-500">Apply for or manage your club, school, and academy affiliation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.href}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{item.type}</CardTitle>
              <Building2 className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-3">
              {item.record ? (
                <>
                  <p className="truncate text-sm font-medium text-primary">{item.name}</p>
                  <StatusBadge status={item.record.status} />
                  {item.record.status === "REJECTED" && item.record.rejectionReason && (
                    <p className="text-xs text-secondary">Reason: {item.record.rejectionReason}</p>
                  )}
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link href={item.href}>{item.record.status === "REJECTED" ? "Correct & Resubmit" : "View Application"}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500">Not applied yet</p>
                  <Button size="sm" variant="outline" asChild className="w-full">
                    <Link href={item.href}>Apply Now</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
