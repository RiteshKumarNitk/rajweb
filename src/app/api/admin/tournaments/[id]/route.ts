import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { resolveTournamentOwnership } from "@/modules/tournaments/tournament-ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { updateTournament } from "@/modules/tournaments/tournament.service";
import { revalidatePublicTournaments } from "@/modules/tournaments/public-tournaments";

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const updateTournamentSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(["JUNIOR", "SENIOR", "OPEN", "PROFESSIONAL"]).optional(),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  stateId: z.string().optional(),
  districtId: z.string().nullable().optional(),
  venue: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  registrationStart: z.string().min(1).nullable().optional(),
  registrationDeadline: z.string().min(1).nullable().optional(),
  maxParticipants: z.number().int().positive().max(10000).nullable().optional(),
  banner: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .refine((v) => !v || isValidUrl(v), { message: "Poster must be a valid URL" }),
  contactName: z.string().max(100).optional(),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.union([z.string().email().max(254), z.literal(""), z.null()]).optional(),
  requiresApprovedPlayer: z.boolean().optional(),
});

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Tournament ID is required");

    const existing = await prisma.tournament.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound("Tournament not found");
    assertInScope(user, existing, "Tournament not found");

    const body = updateTournamentSchema.parse(await request.json());

    // Only re-home the tournament when the client asked to; the resolver
    // keeps district/state admins inside their own scope.
    const ownership =
      body.districtId !== undefined || body.stateId !== undefined
        ? await resolveTournamentOwnership(
            user,
            { stateId: body.stateId, districtId: body.districtId },
            existing.stateId ? { stateId: existing.stateId, districtId: existing.districtId } : undefined
          )
        : undefined;

    const previousStatus = existing.status;

    const tournament = await updateTournament(id, {
      ...body,
      stateId: ownership?.stateId,
      districtId: ownership ? ownership.districtId : undefined,
      contactEmail: body.contactEmail === "" ? null : body.contactEmail,
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "tournaments",
      entityId: id,
      details:
        body.status && body.status !== previousStatus
          ? { event: "TOURNAMENT_STATUS_CHANGED", from: previousStatus, to: body.status, stateId: tournament.stateId, districtId: tournament.districtId }
          : { event: "TOURNAMENT_UPDATED", stateId: tournament.stateId, districtId: tournament.districtId },
    });

    revalidatePublicTournaments();

    return jsonSuccess(
      { id: tournament.id, name: tournament.name, status: tournament.status },
      requestId,
      `Tournament "${tournament.name}" updated`
    );
  },
  { module: "admin-tournaments", requireCsrf: true }
);
