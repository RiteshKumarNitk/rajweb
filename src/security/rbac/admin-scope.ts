import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { getDistrictWhereClause } from "@/security/rbac/district-scope";
import { hasPermission, type PermissionSlug } from "@/security/rbac/permissions";

export async function requireAdminScope(permission?: PermissionSlug) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (permission && !hasPermission(user, permission)) {
    redirect("/admin?error=forbidden");
  }

  const districtWhere = getDistrictWhereClause(user);
  return { user, districtWhere, districtId: districtWhere.districtId };
}
