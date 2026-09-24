import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { RolesManager, type RoleRow } from "./roles-manager";
import type { PermissionOption } from "./role-form-modal";

async function getRolesAndPermissions() {
  try {
    const { default: prisma } = await import("@/infrastructure/database/prisma");
    const [roles, permissions] = await Promise.all([
      prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.permission.findMany({ orderBy: [{ module: "asc" }, { name: "asc" }] }),
    ]);
    return { roles, permissions };
  } catch {
    return { roles: [], permissions: [] };
  }
}

export default async function AdminRolesPage() {
  await requireAdminScope(PERMISSIONS.ROLES_READ);
  const { roles, permissions } = await getRolesAndPermissions();

  const roleRows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    isSystem: r.isSystem,
    permissionIds: r.permissions.map((rp) => rp.permissionId),
    permissionCount: r.permissions.length,
  }));

  const permissionsByModule = permissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
    acc[p.module] = acc[p.module] ?? [];
    acc[p.module].push({ id: p.id, slug: p.slug, name: p.name, module: p.module });
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Roles &amp; Permissions</h1>
        <p className="text-slate-500">
          Create custom roles and control exactly which modules each role can manage. The 6 built-in roles are
          protected and cannot be edited or deleted.
        </p>
      </div>
      <RolesManager roles={roleRows} permissionsByModule={permissionsByModule} />
    </div>
  );
}
