import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertTournamentDistrictAccess } from "@/security/rbac/district-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { createRegistrationCategory } from "@/modules/tournaments/tournament.service";

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(["SINGLES", "DOUBLES"]),
  fee: z.coerce.number().int().min(0).max(1000000),
});

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const tournamentId = params?.id as string | undefined;
    if (!tournamentId) throw AppError.badRequest("Tournament ID is required");

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw AppError.notFound("Tournament not found");
    assertTournamentDistrictAccess(user, tournament.districtId);

    const data = categorySchema.parse(await request.json());
    const category = await createRegistrationCategory(tournamentId, data);

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "tournaments",
      entityId: category.id,
      details: { event: "TOURNAMENT_CATEGORY_CREATED", tournamentId, name: category.name, type: category.type, fee: category.fee },
    });

    return jsonSuccess(category, requestId, `Registration category "${category.name}" added`);
  },
  { module: "admin-tournament-categories", requireCsrf: true }
);
