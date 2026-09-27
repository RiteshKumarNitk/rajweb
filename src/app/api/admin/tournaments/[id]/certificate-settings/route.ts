import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { applicableSignatoryWhere } from "@/modules/certificates/signatory.service";

const imageRef = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v.startsWith("/images/") || /^https:\/\//i.test(v), "Logo must be a /images/... path or an https URL");

const settingsSchema = z.object({
  certificateTitle: z.union([z.string().trim().min(3).max(120), z.literal(""), z.null()]).optional(),
  certificateLogoUrl: z.union([imageRef, z.literal(""), z.null()]).optional(),
  /** Full ordered list — replaces the tournament's signatories. */
  signatoryIds: z.array(z.string().min(1)).max(4).optional(),
});

/**
 * Tournament-specific certificate settings: title, logo and the ordered
 * signatories. Only affects certificates issued afterwards — issued ones keep
 * their snapshot.
 */
export const PUT = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.TOURNAMENTS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Tournament ID is required");

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { signatories: { orderBy: { sortOrder: "asc" } } },
    });
    if (!tournament) throw AppError.notFound("Tournament not found");
    assertInScope(user, tournament, "Tournament not found");

    const data = settingsSchema.parse(await request.json());

    let signatoryIds: string[] | undefined;
    if (data.signatoryIds) {
      signatoryIds = [...new Set(data.signatoryIds)];
      // Each signatory must be usable by THIS tournament (federation, its own
      // state, or its own district) and active — never another district's.
      const usable = await prisma.certificateSignatory.findMany({
        where: { id: { in: signatoryIds }, ...applicableSignatoryWhere(tournament) },
        select: { id: true },
      });
      if (usable.length !== signatoryIds.length) {
        throw AppError.validation("One or more selected signatories are inactive or not available to this tournament");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({
        where: { id },
        data: {
          certificateTitle: data.certificateTitle === undefined ? undefined : data.certificateTitle || null,
          certificateLogoUrl: data.certificateLogoUrl === undefined ? undefined : data.certificateLogoUrl || null,
        },
      });
      if (signatoryIds) {
        await tx.tournamentSignatory.deleteMany({ where: { tournamentId: id } });
        if (signatoryIds.length) {
          await tx.tournamentSignatory.createMany({
            data: signatoryIds.map((signatoryId, index) => ({ tournamentId: id, signatoryId, sortOrder: index })),
          });
        }
      }
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "tournaments",
      entityId: id,
      entityType: "Tournament",
      details: {
        event: "TOURNAMENT_CERTIFICATE_SETTINGS_UPDATED",
        stateId: tournament.stateId,
        districtId: tournament.districtId,
        ...(data.certificateTitle !== undefined ? { certificateTitle: data.certificateTitle || null } : {}),
        ...(data.certificateLogoUrl !== undefined ? { certificateLogoUrl: data.certificateLogoUrl || null } : {}),
        ...(signatoryIds
          ? { previousSignatoryIds: tournament.signatories.map((s) => s.signatoryId), signatoryIds }
          : {}),
      },
    });

    return jsonSuccess({ id, signatoryIds }, requestId, "Certificate settings saved");
  },
  { module: "admin-tournament-certificates", requireCsrf: true }
);
