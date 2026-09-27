import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { revalidatePublicDistricts } from "@/modules/districts/public-districts";
import { stateInputSchema, assertCanManageStates, assertStateUnique, stateSlug } from "@/modules/states/state-admin.service";

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const user = await requirePermission(PERMISSIONS.STATES_MANAGE);
    assertCanManageStates(user);
    const data = stateInputSchema.parse(await request.json());
    await assertStateUnique(data.name, data.code);

    const state = await prisma.state.create({
      data: {
        name: data.name,
        slug: stateSlug(data.name),
        code: data.code ?? null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      module: "states",
      entityId: state.id,
      entityType: "State",
      details: { event: "STATE_CREATED", name: state.name, code: state.code },
    });

    revalidatePublicDistricts();

    return jsonSuccess({ id: state.id, slug: state.slug }, requestId, `State "${state.name}" created`);
  },
  { module: "admin-states", requireCsrf: true }
);
