import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { DataTable, ColumnDef } from "@/shared/components/ui/data-table";
import { Button } from "@/shared/components/ui/button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Applications",
  description: "All your RRA registrations and membership applications in one place.",
};

interface ApplicationRow {
  type: string;
  referenceId: string;
  name: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: Date;
  href: string;
}

export default async function AccountApplicationsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [player, coach, club, school, academy] = await Promise.all([
    prisma.player.findUnique({ where: { userId: authUser.id } }),
    prisma.coach.findUnique({ where: { userId: authUser.id } }),
    prisma.clubMembership.findUnique({ where: { userId: authUser.id } }),
    prisma.schoolMembership.findUnique({ where: { userId: authUser.id } }),
    prisma.academyMembership.findUnique({ where: { userId: authUser.id } }),
  ]);

  const rows: ApplicationRow[] = [];
  if (player) {
    rows.push({ type: "Player", referenceId: player.playerId, name: player.name, status: player.status, rejectionReason: player.rejectionReason, submittedAt: player.createdAt, href: "/account/player" });
  }
  if (coach) {
    rows.push({ type: "Coach", referenceId: coach.coachId, name: coach.name, status: coach.status, rejectionReason: coach.rejectionReason, submittedAt: coach.createdAt, href: "/account/coach" });
  }
  if (club) {
    rows.push({ type: "Club Membership", referenceId: club.membershipId, name: club.clubName, status: club.status, rejectionReason: club.rejectionReason, submittedAt: club.createdAt, href: "/account/memberships/club" });
  }
  if (school) {
    rows.push({ type: "School Membership", referenceId: school.membershipId, name: school.schoolName, status: school.status, rejectionReason: school.rejectionReason, submittedAt: school.createdAt, href: "/account/memberships/school" });
  }
  if (academy) {
    rows.push({ type: "Academy Membership", referenceId: academy.membershipId, name: academy.academyName, status: academy.status, rejectionReason: academy.rejectionReason, submittedAt: academy.createdAt, href: "/account/memberships/academy" });
  }

  rows.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  const columns: ColumnDef<ApplicationRow>[] = [
    { header: "Type", accessorKey: "type", className: "font-medium" },
    { header: "Reference ID", cell: (r) => <code className="text-xs">{r.referenceId}</code> },
    { header: "Name", accessorKey: "name" },
    { header: "Submitted", cell: (r) => formatDate(r.submittedAt) },
    {
      header: "Status",
      cell: (r) => (
        <div>
          <StatusBadge status={r.status} />
          {r.status === "REJECTED" && r.rejectionReason && (
            <p className="mt-1 max-w-xs text-xs text-secondary">{r.rejectionReason}</p>
          )}
        </div>
      ),
    },
    {
      header: "",
      cell: (r) => (
        <Button variant="outline" size="sm" asChild>
          <Link href={r.href}>{r.status === "REJECTED" ? "Correct & Resubmit" : "View"}</Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">My Applications</h1>
        <p className="text-slate-500">Every registration and membership application you&apos;ve submitted.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {rows.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="You haven't submitted any player, coach, or membership applications."
              action={
                <Button asChild>
                  <Link href="/account/dashboard">Get Started</Link>
                </Button>
              }
            />
          ) : (
            <DataTable data={rows} columns={columns} keyExtractor={(r) => r.referenceId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
