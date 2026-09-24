import { z } from "zod";
import slugify from "slugify";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";

const createRoleSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(200).optional(),
  permissionIds: z.array(z.string()).default([]),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const actor = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const data = createRoleSchema.parse(await request.json());

    let slug = slugify(data.name, { lower: true, strict: true });
    let suffix = 1;
    while (await prisma.role.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${slugify(data.name, { lower: true, strict: true })}-${suffix}`;
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        isSystem: false,
      },
    });

    if (data.permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: data.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }

    await createAuditLog({
      userId: actor.id,
      action: "CREATE",
      module: "roles",
      entityId: role.id,
      details: { name: role.name, slug: role.slug, permissionIds: data.permissionIds },
    });

    return jsonSuccess({ id: role.id, slug: role.slug }, requestId, `Role "${role.name}" created`);
  },
  { module: "admin-roles", requireCsrf: true }
);
