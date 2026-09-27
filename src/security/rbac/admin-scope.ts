import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { getOrgScope } from "@/security/rbac/org-scope";
import { hasPermission, type PermissionSlug } from "@/security/rbac/permissions";

/**
 * Page-level gate for /admin/*: session + optional permission, then the
 * caller's organisational scope. Pages must build their queries from
 * `scope` (org-scope.ts where-builders) — never filter in React.
 */
export async function requireAdminScope(permission?: PermissionSlug) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (permission && !hasPermission(user, permission)) {
    redirect("/admin?error=forbidden");
  }

  return { user, scope: getOrgScope(user) };
}
