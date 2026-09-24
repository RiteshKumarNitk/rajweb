import { AppError } from "@/core/errors/app-error";
import { auth } from "@/modules/auth/config/auth";
import {
  hasPermission,
  hasAnyPermission,
  type PermissionSlug,
  type SessionUser,
} from "@/security/rbac/permissions";

export async function getSession() {
  return auth();
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  const user = session.user as SessionUser;
  // isActive is refreshed from the DB on every request (see auth.ts jwt
  // callback) — a deactivation takes effect on the user's next request, not
  // after their session naturally expires.
  if (user.isActive === false) return null;
  return user;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function requirePermission(permission: PermissionSlug) {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) throw AppError.forbidden();
  return user;
}

export async function requireAnyPermission(permissions: PermissionSlug[]) {
  const user = await requireAuth();
  if (!hasAnyPermission(user, permissions)) throw AppError.forbidden();
  return user;
}
