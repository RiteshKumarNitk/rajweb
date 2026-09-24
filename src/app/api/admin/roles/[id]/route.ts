import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";

const updateRoleSchema = z.object({
  permissionIds: z.array(z.string()),
});

export const PATCH = withApiHandler(
  async (request, { requestId, params }) => {
    const actor = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Role ID is required");

    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw AppError.notFound("Role not found");
    if (role.isSystem) {
      throw AppError.forbidden("Built-in system roles cannot be edited");
    }

    const { permissionIds } = updateRoleSchema.parse(await request.json());
    const previousSlugs = role.permissions.map((rp) => rp.permission.slug).sort();

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    const newPermissions = await prisma.permission.findMany({ where: { id: { in: permissionIds } } });
    const newSlugs = newPermissions.map((p) => p.slug).sort();

    await createAuditLog({
      userId: actor.id,
      action: "UPDATE",
      module: "roles",
      entityId: id,
      details: { field: "permissions", previousValue: previousSlugs, newValue: newSlugs },
    });

    return jsonSuccess({ id, permissions: newSlugs }, requestId, `Role "${role.name}" updated`);
  },
  { module: "admin-roles", requireCsrf: true }
);
