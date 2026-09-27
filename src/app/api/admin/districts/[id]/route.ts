import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { assertInScope, getOrgScope } from "@/security/rbac/org-scope";
import { createAuditLog } from "@/services/audit/audit-service";
import { revalidatePublicDistricts } from "@/modules/districts/public-districts";
import {
  updateDistrictSchema,
  resolveDistrictState,
  assertDistrictNameAvailable,
  districtSlug,
} from "@/modules/districts/district-admin.service";

const AUDITED_FIELDS = [
  "name",
  "stateId",
  "president",
  "secretary",
  "email",
  "phone",
  "address",
  "isActive",
  "sortOrder",
] as const;

async function loadScopedDistrict(user: Parameters<typeof assertInScope>[0], id: string | undefined) {
  if (!id) throw AppError.badRequest("District ID is required");
  const district = await prisma.district.findUnique({ where: { id } });
  if (!district) throw AppError.notFound("District not found");
  assertInScope(user, { districtId: district.id, stateId: district.stateId }, "District not found");
  return district;
}

export const GET = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_READ);
    const district = await loadScopedDistrict(user, params?.id as string | undefined);
    return jsonSuccess(district, requestId);
  },
  { module: "admin-districts" }
);

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_MANAGE);
    const district = await loadScopedDistrict(user, params?.id as string | undefined);
    const data = updateDistrictSchema.parse(await request.json());

    // Moving a district to another state re-homes every player/coach/member
    // under it, so only GLOBAL users may do it (resolveDistrictState enforces).
    let stateId = district.stateId;
    if (data.stateId !== undefined && data.stateId !== district.stateId) {
      if (getOrgScope(user).level !== "GLOBAL") throw AppError.forbidden("Only the Super Admin can move a district to another state");
      stateId = await resolveDistrictState(user, data.stateId);
    }

    const name = data.name ?? district.name;
    if ((data.name !== undefined && data.name !== district.name) || stateId !== district.stateId) {
      if (!stateId) throw AppError.validation("Assign this district to a state before renaming it");
      await assertDistrictNameAvailable(stateId, name, district.id);
    }

    const updated = await prisma.district.update({
      where: { id: district.id },
      data: {
        name: data.name,
        // The slug follows the name so public URLs stay readable; records
        // reference districts by id, never by slug.
        slug: data.name !== undefined && data.name !== district.name ? districtSlug(data.name) : undefined,
        stateId: stateId !== district.stateId ? stateId : undefined,
        president: data.president,
        secretary: data.secretary,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    const changed = AUDITED_FIELDS.filter((f) => updated[f] !== district[f]);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "districts",
      entityId: district.id,
      entityType: "District",
      details: {
        event: "DISTRICT_UPDATED",
        fields: [...changed],
        previousValues: Object.fromEntries(changed.map((f) => [f, district[f]])),
        newValues: Object.fromEntries(changed.map((f) => [f, updated[f]])),
      },
    });

    revalidatePublicDistricts();

    return jsonSuccess(updated, requestId, `District "${updated.name}" updated`);
  },
  { module: "admin-districts", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_MANAGE);
    const scoped = await loadScopedDistrict(user, params?.id as string | undefined);

    const district = await prisma.district.findUniqueOrThrow({
      where: { id: scoped.id },
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
            equipmentItems: true,
            equipmentOrders: true,
            signatories: true,
          },
        },
      },
    });

    const inUse = Object.values(district._count).some((n) => n > 0);
    if (inUse) {
      throw AppError.conflict(
        "This district has linked users, players, coaches, memberships, tournaments, requests, equipment, orders or signatories and cannot be deleted. Deactivate it instead."
      );
    }

    await prisma.district.delete({ where: { id: district.id } });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "districts",
      entityId: district.id,
      entityType: "District",
      details: { event: "DISTRICT_DELETED", name: district.name, slug: district.slug, stateId: district.stateId },
    });

    revalidatePublicDistricts();

    return jsonSuccess({ id: district.id, deleted: true }, requestId, `District "${district.name}" deleted`);
  },
  { module: "admin-districts", requireCsrf: true }
);
