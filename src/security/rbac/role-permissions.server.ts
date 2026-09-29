import prisma from "@/infrastructure/database/prisma";
import type { PermissionSlug } from "@/security/rbac/permissions";

const permissionsCache = new Map<string, { permissions: PermissionSlug[]; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute in-memory cache

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
  const cached = permissionsCache.get(roleId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.permissions;
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { slug: true } } },
  });
  const permissions = rolePermissions.map((rp) => rp.permission.slug as PermissionSlug);
  permissionsCache.set(roleId, { permissions, expiresAt: now + CACHE_TTL_MS });
  return permissions;
}

export function invalidatePermissionsCache(roleId?: string) {
  if (roleId) {
    permissionsCache.delete(roleId);
  } else {
    permissionsCache.clear();
  }
}
