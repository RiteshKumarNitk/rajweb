import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertDistrictAccess } from "@/security/rbac/district-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { revalidatePublicDistricts } from "@/modules/districts/public-districts";

/**
 * Editable fields. `name`/`slug` are intentionally excluded: districts are
 * referenced by name across public forms (case-insensitive resolution), by
 * district scoping, and by seeded admin accounts — renaming could silently
 * break that resolution. Leadership/contact/active fields are safe to edit.
 */
const updateDistrictSchema = z
  .object({
    president: z.string().max(100).nullable().optional(),
    secretary: z.string().max(100).nullable().optional(),
    email: z
      .union([z.string().email().max(254), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    phone: z
      .union([z.string().min(6).max(20), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    address: z
      .union([z.string().max(300), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "No changes provided",
  });

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("District ID is required");

    const district = await prisma.district.findUnique({ where: { id } });
    if (!district) throw AppError.notFound("District not found");

    assertDistrictAccess(user, district.id);

    const data = updateDistrictSchema.parse(await request.json());

    const updated = await prisma.district.update({ where: { id }, data });

    const changedFields = [
      data.president !== undefined && "president",
      data.secretary !== undefined && "secretary",
      data.email !== undefined && "email",
      data.phone !== undefined && "phone",
      data.address !== undefined && "address",
      data.isActive !== undefined && "isActive",
    ].filter(Boolean);

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "districts",
      entityId: id,
      details: {
        event: "DISTRICT_UPDATED",
        fields: changedFields,
        previousValues: {
          president: district.president,
          secretary: district.secretary,
          email: district.email,
          phone: district.phone,
          address: district.address,
          isActive: district.isActive,
        },
        newValues: {
          president: updated.president,
          secretary: updated.secretary,
          email: updated.email,
          phone: updated.phone,
          address: updated.address,
          isActive: updated.isActive,
        },
      },
    });

    revalidatePublicDistricts();

    return jsonSuccess(
      {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: updated.isActive,
        president: updated.president,
        secretary: updated.secretary,
        email: updated.email,
        phone: updated.phone,
        address: updated.address,
      },
      requestId,
      `District "${updated.name}" updated`
    );
  },
  { module: "admin-districts", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("District ID is required");

    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            players: true,
            coaches: true,
            clubMemberships: true,
            schoolMemberships: true,
            academyMemberships: true,
            tournaments: true,
            requestedByRequests: true,
          },
        },
      },
    });
    if (!district) throw AppError.notFound("District not found");

    assertDistrictAccess(user, district.id);

    const inUse =
      district._count.users > 0 ||
      district._count.players > 0 ||
      district._count.coaches > 0 ||
      district._count.clubMemberships > 0 ||
      district._count.schoolMemberships > 0 ||
      district._count.academyMemberships > 0 ||
      district._count.tournaments > 0 ||
      district._count.requestedByRequests > 0;

    if (inUse) {
      throw AppError.conflict(
        "This district has linked users, players, coaches, memberships, tournaments, or requests and cannot be deleted. Deactivate it instead."
      );
    }

    await prisma.district.delete({ where: { id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "districts",
      entityId: id,
      details: { event: "DISTRICT_DELETED", name: district.name, slug: district.slug },
    });

    revalidatePublicDistricts();

    return jsonSuccess(
      { id, deleted: true },
      requestId,
      `District "${district.name}" deleted`
    );
  },
  { module: "admin-districts", requireCsrf: true }
);
