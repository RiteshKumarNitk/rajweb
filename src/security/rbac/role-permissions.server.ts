import prisma from "@/infrastructure/database/prisma";
import type { PermissionSlug } from "@/security/rbac/permissions";

/**
 * The single runtime source of truth for what a role can do — reads the
 * RolePermission table, so permissions assigned to a role via /admin/roles
 * take effect immediately without a code change or redeploy.
 *
 * Deliberately kept out of permissions.ts: that file is imported by client
 * components (e.g. the admin sidebar) for PERMISSIONS/hasPermission, and
 * pulling Prisma (and transitively `pg`, which needs Node's net/tls/fs/dns)
 * into that import graph breaks the client bundle. Only server-only code
 * (auth.ts) should import this file.
 */
export async function getPermissionsForRole(roleId: string): Promise<PermissionSlug[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return rolePermissions.map((rp) => rp.permission.slug as PermissionSlug);
}
