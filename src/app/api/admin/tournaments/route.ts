import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { resolveTournamentOwnership } from "@/modules/tournaments/tournament-ownership.server";
import { createAuditLog } from "@/services/audit/audit-service";
import { createTournament } from "@/modules/tournaments/tournament.service";
import { revalidatePublicTournaments } from "@/modules/tournaments/public-tournaments";

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const createTournamentSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(["JUNIOR", "SENIOR", "OPEN", "PROFESSIONAL"]),
  status: z.enum(["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  venue: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
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

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const body = createTournamentSchema.parse(await request.json());

    // Ownership comes from the caller's scope: district/state admins cannot
    // create tournaments outside their own district/state.
    const ownership = await resolveTournamentOwnership(user, {
      stateId: body.stateId,
      districtId: body.districtId ?? null,
    });

    const tournament = await createTournament({
      ...body,
      stateId: ownership.stateId,
      districtId: ownership.districtId,
      contactEmail: body.contactEmail || undefined,
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "tournaments",
      entityId: tournament.id,
      details: {
        event: "TOURNAMENT_CREATED",
        name: tournament.name,
        slug: tournament.slug,
        stateId: ownership.stateId,
        districtId: ownership.districtId,
      },
    });

    revalidatePublicTournaments();

    return jsonSuccess(
      {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        status: tournament.status,
      },
      requestId,
      `Tournament "${tournament.name}" created`
    );
  },
  { module: "admin-tournaments", requireCsrf: true }
);
