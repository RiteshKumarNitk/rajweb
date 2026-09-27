import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";
import { revalidatePublicDistricts } from "@/modules/districts/public-districts";
import { stateUpdateSchema, assertCanManageStates, assertStateUnique, stateSlug } from "@/modules/states/state-admin.service";

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.STATES_MANAGE);
    assertCanManageStates(user);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("State ID is required");

    const state = await prisma.state.findUnique({ where: { id } });
    if (!state) throw AppError.notFound("State not found");

    const data = stateUpdateSchema.parse(await request.json());
    const renamed = data.name !== undefined && data.name !== state.name;
    if (renamed || (data.code !== undefined && data.code !== state.code)) {
      await assertStateUnique(data.name ?? state.name, data.code === undefined ? null : data.code, state.id);
    }

    const updated = await prisma.state.update({
      where: { id: state.id },
      data: {
        name: data.name,
        slug: renamed ? stateSlug(data.name!) : undefined,
        code: data.code,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    const fields = (["name", "code", "isActive", "sortOrder"] as const).filter((f) => updated[f] !== state[f]);
    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      module: "states",
      entityId: state.id,
      entityType: "State",
      details: {
        event: "STATE_UPDATED",
        fields: [...fields],
        previousValues: Object.fromEntries(fields.map((f) => [f, state[f]])),
        newValues: Object.fromEntries(fields.map((f) => [f, updated[f]])),
      },
    });

    revalidatePublicDistricts();

    return jsonSuccess(updated, requestId, `State "${updated.name}" updated`);
  },
  { module: "admin-states", requireCsrf: true }
);

export const DELETE = withApiHandler(
  async (_request, { requestId, params }) => {
    const user = await requirePermission(PERMISSIONS.STATES_MANAGE);
    assertCanManageStates(user);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("State ID is required");

    const state = await prisma.state.findUnique({
      where: { id },
      include: { _count: { select: { districts: true, users: true, tournaments: true } } },
    });
    if (!state) throw AppError.notFound("State not found");

    // Never cascade business data: a state with districts, admins or
    // tournaments can only be deactivated.
    if (state._count.districts > 0 || state._count.users > 0 || state._count.tournaments > 0) {
      throw AppError.conflict(
        "This state still has districts, administrators, or tournaments and cannot be deleted. Deactivate it instead."
      );
    }

    await prisma.state.delete({ where: { id: state.id } });
    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      module: "states",
      entityId: state.id,
      entityType: "State",
      details: { event: "STATE_DELETED", name: state.name, code: state.code },
    });

    revalidatePublicDistricts();

    return jsonSuccess({ id: state.id, deleted: true }, requestId, `State "${state.name}" deleted`);
  },
  { module: "admin-states", requireCsrf: true }
);
