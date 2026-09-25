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
  description: "All your Rajasthan Racquetball Association registrations and membership applications in one place.",
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
    prisma.player.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.coach.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.clubMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.schoolMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.academyMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
  ]);

  const rows: ApplicationRow[] = [];
  if (player) {
    rows.push({
      type: "Player Registration",
      referenceId: player.playerId,
      name: player.name,
      status: player.status,
      rejectionReason: player.rejectionReason,
      submittedAt: player.createdAt,
      href: "/account/player",
    });
  }
  if (coach) {
    rows.push({
      type: "Coach Registration",
      referenceId: coach.coachId,
      name: coach.name,
      status: coach.status,
      rejectionReason: coach.rejectionReason,
      submittedAt: coach.createdAt,
      href: "/account/coach",
    });
  }
  if (club) {
    rows.push({
      type: "Club Affiliation",
      referenceId: club.membershipId,
      name: club.clubName,
      status: club.status,
      rejectionReason: club.rejectionReason,
      submittedAt: club.createdAt,
      href: "/account/memberships/club",
    });
  }
  if (school) {
    rows.push({
      type: "School Affiliation",
      referenceId: school.membershipId,
      name: school.schoolName,
      status: school.status,
      rejectionReason: school.rejectionReason,
      submittedAt: school.createdAt,
      href: "/account/memberships/school",
    });
  }
  if (academy) {
    rows.push({
      type: "Academy Affiliation",
      referenceId: academy.membershipId,
      name: academy.academyName,
      status: academy.status,
      rejectionReason: academy.rejectionReason,
      submittedAt: academy.createdAt,
      href: "/account/memberships/academy",
    });
  }

  rows.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  const columns: ColumnDef<ApplicationRow>[] = [
    { header: "Application Type", accessorKey: "type", className: "font-semibold text-primary" },
    {
      header: "Reference ID",
      cell: (r) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono">{r.referenceId}</code>,
    },
    { header: "Registered Name", accessorKey: "name" },
    { header: "Date Submitted", cell: (r) => formatDate(r.submittedAt) },
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
        <Button variant="outline" size="sm" asChild className="text-xs">
          <Link href={r.href}>{r.status === "REJECTED" ? "Correct & Resubmit" : "View Application"}</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Applications</h1>
        <p className="text-sm text-slate-500">
          Every player, coach, and institutional membership application you&apos;ve submitted.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {rows.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="You haven't submitted any player, coach, or membership applications yet."
              action={
                <Button asChild size="sm" className="bg-primary text-white hover:bg-slate-800">
                  <Link href="/account/dashboard">Get Started on Dashboard</Link>
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
