import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope } from "@/security/rbac/org-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { applicableSignatoryWhere } from "@/modules/certificates/signatory.service";

const text = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();
const list = (maxItems: number, maxLen: number) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).optional();

const settingsSchema = z.object({
  certificateTemplateId: z.union([z.string().min(1).max(40), z.null()]).optional(),
  /** Overrides the template's heading ("Certificate"). */
  certificateTitle: text(60),
  certificateOrganizedBy: text(150),
  certificateRecognizedBy: list(8, 150),
  /** YYYY-MM-DD, printed on every certificate of this tournament; null = the day of issue. */
  certificateIssueDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
  certificateNumberPrefix: z
    .union([z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]*$/, "Prefix may use letters, digits and / _ . -"), z.null()])
    .optional(),
  certificateNumberStart: z.number().int().min(1).max(999999).optional(),
  certificateNumberPadding: z.number().int().min(1).max(6).optional(),
  certificateCategoryOptions: list(12, 60),
  certificateEventOptions: list(12, 60),
  /** Full ordered list — replaces the tournament's signatories. `title` = designation printed for this tournament. */
  signatories: z
    .array(z.object({ signatoryId: z.string().min(1), title: z.union([z.string().trim().max(60), z.null()]).optional() }))
    .max(4)
    .optional(),
});

const SCALAR_FIELDS = [
  "certificateTemplateId",
  "certificateTitle",
  "certificateOrganizedBy",
  "certificateRecognizedBy",
  "certificateIssueDate",
  "certificateNumberPrefix",
  "certificateNumberStart",
  "certificateNumberPadding",
  "certificateCategoryOptions",
  "certificateEventOptions",
] as const;

/**
 * Tournament-specific certificate settings: template, heading, organisers,
 * issue date, numbering, printed category/event lists and the ordered
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

    if (data.certificateTemplateId && data.certificateTemplateId !== tournament.certificateTemplateId) {
      const template = await prisma.certificateTemplate.findUnique({ where: { id: data.certificateTemplateId }, select: { status: true } });
      if (!template || template.status !== "ACTIVE") throw AppError.validation("Choose an active certificate template");
    }

    let signatories: { signatoryId: string; title: string | null }[] | undefined;
    if (data.signatories) {
      const seen = new Set<string>();
      signatories = data.signatories
        .filter((s) => !seen.has(s.signatoryId) && seen.add(s.signatoryId))
        .map((s) => ({ signatoryId: s.signatoryId, title: s.title?.trim() || null }));
      // Each signatory must be usable by THIS tournament (federation, its own
      // state, or its own district) and active — never another district's.
      const usable = await prisma.certificateSignatory.findMany({
        where: { id: { in: signatories.map((s) => s.signatoryId) }, ...applicableSignatoryWhere(tournament) },
        select: { id: true },
      });
      if (usable.length !== signatories.length) {
        throw AppError.validation("One or more selected signatories are inactive or not available to this tournament");
      }
    }

    const update = {
      certificateTemplateId: data.certificateTemplateId,
      certificateTitle: data.certificateTitle === undefined ? undefined : data.certificateTitle || null,
      certificateOrganizedBy: data.certificateOrganizedBy === undefined ? undefined : data.certificateOrganizedBy || null,
      certificateRecognizedBy: data.certificateRecognizedBy,
      certificateIssueDate:
        data.certificateIssueDate === undefined ? undefined : data.certificateIssueDate ? new Date(`${data.certificateIssueDate}T12:00:00+05:30`) : null,
      certificateNumberPrefix: data.certificateNumberPrefix === undefined ? undefined : data.certificateNumberPrefix?.replace(/\/+$/, "") || null,
      certificateNumberStart: data.certificateNumberStart,
      certificateNumberPadding: data.certificateNumberPadding,
      certificateCategoryOptions: data.certificateCategoryOptions,
      certificateEventOptions: data.certificateEventOptions,
    };

    await prisma.$transaction(async (tx) => {
      await tx.tournament.update({ where: { id }, data: update });
      if (signatories) {
        await tx.tournamentSignatory.deleteMany({ where: { tournamentId: id } });
        if (signatories.length) {
          await tx.tournamentSignatory.createMany({
            data: signatories.map((s, index) => ({ tournamentId: id, signatoryId: s.signatoryId, title: s.title, sortOrder: index })),
          });
        }
      }
    });

    const changed = SCALAR_FIELDS.filter((f) => update[f] !== undefined);
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
        previousValues: Object.fromEntries(changed.map((f) => [f, tournament[f]])),
        newValues: Object.fromEntries(changed.map((f) => [f, update[f]])),
        ...(signatories
          ? { previousSignatories: tournament.signatories.map((s) => ({ signatoryId: s.signatoryId, title: s.title })), signatories }
          : {}),
      },
    });

    return jsonSuccess({ id }, requestId, "Certificate settings saved");
  },
  { module: "admin-tournament-certificates", requireCsrf: true }
);
