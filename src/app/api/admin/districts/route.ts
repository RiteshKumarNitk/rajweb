import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { revalidatePublicDistricts } from "@/modules/districts/public-districts";
import {
  createDistrictSchema,
  resolveDistrictState,
  assertDistrictNameAvailable,
  districtSlug,
} from "@/modules/districts/district-admin.service";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.DISTRICTS_MANAGE);
    const data = createDistrictSchema.parse(await request.json());

    const stateId = await resolveDistrictState(user, data.stateId);
    await assertDistrictNameAvailable(stateId, data.name);

    const district = await prisma.district.create({
      data: {
        name: data.name,
        slug: districtSlug(data.name),
        stateId,
        president: data.president ?? null,
        secretary: data.secretary ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "districts",
      entityId: district.id,
      entityType: "District",
      details: { event: "DISTRICT_CREATED", name: district.name, stateId },
    });

    revalidatePublicDistricts();

    return jsonSuccess({ id: district.id, slug: district.slug }, requestId, `District "${district.name}" created`);
  },
  { module: "admin-districts", requireCsrf: true }
);
