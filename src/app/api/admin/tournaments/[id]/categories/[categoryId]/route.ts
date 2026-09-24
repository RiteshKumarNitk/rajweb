import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertTournamentDistrictAccess } from "@/security/rbac/district-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { updateRegistrationCategory, removeOrDisableRegistrationCategory } from "@/modules/tournaments/tournament.service";

const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["SINGLES", "DOUBLES"]).optional(),
  fee: z.coerce.number().int().min(0).max(1000000).optional(),
  isActive: z.boolean().optional(),
});

async function loadScopedCategory(tournamentId: string, categoryId: string) {
  const category = await prisma.tournamentRegistrationCategory.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category || category.tournamentId !== tournamentId) {
    throw AppError.notFound("Registration category not found");
  }
  return category;
}

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const tournamentId = params?.id as string | undefined;
    const categoryId = params?.categoryId as string | undefined;
    if (!tournamentId || !categoryId) throw AppError.badRequest("Tournament and category ID are required");

    const category = await loadScopedCategory(tournamentId, categoryId);
    assertTournamentDistrictAccess(user, category.tournament.districtId);

    const data = updateCategorySchema.parse(await request.json());
    const previousFee = category.fee;
    const updated = await updateRegistrationCategory(categoryId, data);

    const feeChanged = data.fee !== undefined && data.fee !== previousFee;
    const disabled = data.isActive === false && category.isActive;

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "tournaments",
      entityId: categoryId,
      details: feeChanged
        ? { event: "TOURNAMENT_FEE_CHANGED", tournamentId, from: previousFee, to: data.fee }
        : disabled
          ? { event: "TOURNAMENT_CATEGORY_DISABLED", tournamentId }
          : { event: "TOURNAMENT_CATEGORY_UPDATED", tournamentId },
    });

    return jsonSuccess(updated, requestId, `Registration category "${updated.name}" updated`);
  },
  { module: "admin-tournament-categories", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const tournamentId = params?.id as string | undefined;
    const categoryId = params?.categoryId as string | undefined;
    if (!tournamentId || !categoryId) throw AppError.badRequest("Tournament and category ID are required");

    const category = await loadScopedCategory(tournamentId, categoryId);
    assertTournamentDistrictAccess(user, category.tournament.districtId);

    const result = await removeOrDisableRegistrationCategory(categoryId);

    await createAuditLog({
      userId: user.id,
      action: result.deleted ? "DELETE" : "UPDATE",
      module: "tournaments",
      entityId: categoryId,
      details: result.deleted
        ? { event: "TOURNAMENT_CATEGORY_DELETED", tournamentId }
        : { event: "TOURNAMENT_CATEGORY_DISABLED", tournamentId },
    });

    return jsonSuccess(
      result,
      requestId,
      result.deleted ? "Registration category removed" : "Registration category disabled (existing registrations depend on it)"
    );
  },
  { module: "admin-tournament-categories", requireCsrf: true }
);
