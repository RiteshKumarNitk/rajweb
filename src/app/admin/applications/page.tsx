import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { getDistrictWhereClause } from "@/security/rbac/district-scope";
import { hasPermission, hasAnyPermission, PERMISSIONS } from "@/security/rbac/permissions";
import prisma from "@/infrastructure/database/prisma";
import { ApplicationsTable, type ApplicationRow } from "./applications-table";

const LIST_LIMIT = 100;

async function getApplications(
  districtWhere: { districtId?: string },
  canReadPlayers: boolean,
  canReadCoaches: boolean,
  canReadMemberships: boolean
): Promise<ApplicationRow[]> {
  const [players, coaches, clubs, schools, academies] = await Promise.all([
    canReadPlayers
      ? prisma.player.findMany({
          where: districtWhere,
          include: { district: true },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        })
      : [],
    canReadCoaches
      ? prisma.coach.findMany({
          where: districtWhere,
          include: { district: true },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        })
      : [],
    canReadMemberships
      ? prisma.clubMembership.findMany({
          where: districtWhere,
          include: { district: true },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        })
      : [],
    canReadMemberships
      ? prisma.schoolMembership.findMany({
          where: districtWhere,
          include: { district: true },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        })
      : [],
    canReadMemberships
      ? prisma.academyMembership.findMany({
          where: districtWhere,
          include: { district: true },
          orderBy: { createdAt: "desc" },
          take: LIST_LIMIT,
        })
      : [],
  ]);

  const rows: ApplicationRow[] = [
    ...players.map((p) => ({
      type: "player" as const,
      id: p.id,
      applicationId: p.playerId,
      applicantName: p.name,
      email: p.email,
      district: p.district.name,
      status: p.status,
      submittedAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    ...coaches.map((c) => ({
      type: "coach" as const,
      id: c.id,
      applicationId: c.coachId,
      applicantName: c.name,
      email: c.email,
      district: c.district.name,
      status: c.status,
      submittedAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    ...clubs.map((m) => ({
      type: "club" as const,
      id: m.id,
      applicationId: m.membershipId,
      applicantName: m.clubName,
      email: m.email,
      district: m.district.name,
      status: m.status,
      submittedAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    ...schools.map((m) => ({
      type: "school" as const,
      id: m.id,
      applicationId: m.membershipId,
      applicantName: m.schoolName,
      email: m.email,
      district: m.district.name,
      status: m.status,
      submittedAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    ...academies.map((m) => ({
      type: "academy" as const,
      id: m.id,
      applicationId: m.membershipId,
      applicantName: m.academyName,
      email: m.email,
      district: m.district.name,
      status: m.status,
      submittedAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
  ];

  rows.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return rows;
}

export default async function AdminApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canReadPlayers = hasPermission(user, PERMISSIONS.PLAYERS_READ);
  const canReadCoaches = hasPermission(user, PERMISSIONS.COACHES_READ);
  const canReadMemberships = hasPermission(user, PERMISSIONS.MEMBERSHIPS_READ);

  if (!hasAnyPermission(user, [PERMISSIONS.PLAYERS_READ, PERMISSIONS.COACHES_READ, PERMISSIONS.MEMBERSHIPS_READ])) {
    redirect("/admin?error=forbidden");
  }

  const districtWhere = getDistrictWhereClause(user);
  const applications = await getApplications(districtWhere, canReadPlayers, canReadCoaches, canReadMemberships);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Application Review Center</h1>
        <p className="text-slate-500">
          Review and process Player, Coach, and Membership applications submitted across the system
          {districtWhere.districtId ? " (your district)" : ""}.
        </p>
      </div>

      <ApplicationsTable applications={applications} />
    </div>
  );
}
