// Reserved system role slugs that get hardcoded, permanent treatment in the
// auth/authorization code (safety nets that must never depend on data that a
// Super Admin could edit or delete). Every other role — including the seeded
// federation-admin/district-admin/tournament-manager/content-manager and any
// role a Super Admin creates later via /admin/roles — is a plain data-driven
// row in the Role table; its permissions come from RolePermission, not from
// this file. See ROLE_PERMISSIONS below for what it's still used for.
export const ROLES = {
  SUPER_ADMIN: "super-admin",
  FEDERATION_ADMIN: "federation-admin",
  DISTRICT_ADMIN: "district-admin",
  TOURNAMENT_MANAGER: "tournament-manager",
  CONTENT_MANAGER: "content-manager",
  PUBLIC_USER: "public-user",
} as const;

// Role slugs are no longer a fixed set at runtime — a Super Admin can create
// new roles with arbitrary slugs (e.g. "certificate-manager") via /admin/roles.
// `string` here, not the old 6-value literal union.
export type RoleSlug = string;

export const PERMISSIONS = {
  // Users
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  // Roles
  ROLES_READ: "roles:read",
  ROLES_MANAGE: "roles:manage",
  // Players
  PLAYERS_READ: "players:read",
  PLAYERS_CREATE: "players:create",
  PLAYERS_UPDATE: "players:update",
  PLAYERS_APPROVE: "players:approve",
  // Coaches
  COACHES_READ: "coaches:read",
  COACHES_CREATE: "coaches:create",
  COACHES_UPDATE: "coaches:update",
  COACHES_APPROVE: "coaches:approve",
  // Memberships
  MEMBERSHIPS_READ: "memberships:read",
  MEMBERSHIPS_APPROVE: "memberships:approve",
  // Requests (Player/Coach service requests — distinct from registration)
  REQUESTS_VIEW: "requests:view",
  REQUESTS_APPROVE: "requests:approve",
  // Tournaments
  TOURNAMENTS_READ: "tournaments:read",
  TOURNAMENTS_MANAGE: "tournaments:manage",
  // Media
  MEDIA_READ: "media:read",
  MEDIA_MANAGE: "media:manage",
  // Certificates
  CERTIFICATES_READ: "certificates:read",
  CERTIFICATES_ISSUE: "certificates:issue",
  // Districts
  DISTRICTS_READ: "districts:read",
  DISTRICTS_MANAGE: "districts:manage",
  // Content
  CONTENT_READ: "content:read",
  CONTENT_MANAGE: "content:manage",
  // Equipment enquiries (public equipment order form)
  EQUIPMENT_READ: "equipment:read",
  // Audit
  AUDIT_READ: "audit:read",
  // Settings
  SETTINGS_MANAGE: "settings:manage",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Bootstrap data only: prisma/seed.ts uses this to populate the RolePermission
// table for the 6 built-in system roles on first seed. Runtime permission
// checks do NOT read this map — they read RolePermission rows via
// getPermissionsForRole() below, so a Super Admin editing a role's
// permissions through /admin/roles takes effect without a code change.
export const ROLE_PERMISSIONS: Record<string, PermissionSlug[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.FEDERATION_ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.PLAYERS_READ,
    PERMISSIONS.PLAYERS_APPROVE,
    PERMISSIONS.COACHES_READ,
    PERMISSIONS.COACHES_APPROVE,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.MEMBERSHIPS_APPROVE,
    PERMISSIONS.REQUESTS_VIEW,
    PERMISSIONS.REQUESTS_APPROVE,
    PERMISSIONS.TOURNAMENTS_READ,
    PERMISSIONS.TOURNAMENTS_MANAGE,
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.CERTIFICATES_READ,
    PERMISSIONS.CERTIFICATES_ISSUE,
    PERMISSIONS.DISTRICTS_READ,
    PERMISSIONS.DISTRICTS_MANAGE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLES.DISTRICT_ADMIN]: [
    PERMISSIONS.PLAYERS_READ,
    PERMISSIONS.PLAYERS_CREATE,
    PERMISSIONS.PLAYERS_UPDATE,
    PERMISSIONS.PLAYERS_APPROVE,
    PERMISSIONS.COACHES_READ,
    PERMISSIONS.COACHES_APPROVE,
    PERMISSIONS.MEMBERSHIPS_READ,
    PERMISSIONS.MEMBERSHIPS_APPROVE,
    PERMISSIONS.REQUESTS_VIEW,
    PERMISSIONS.REQUESTS_APPROVE,
    PERMISSIONS.TOURNAMENTS_READ,
    PERMISSIONS.TOURNAMENTS_MANAGE,
    PERMISSIONS.CERTIFICATES_READ,
    PERMISSIONS.CERTIFICATES_ISSUE,
    PERMISSIONS.DISTRICTS_READ,
  ],
  [ROLES.TOURNAMENT_MANAGER]: [
    PERMISSIONS.TOURNAMENTS_READ,
    PERMISSIONS.TOURNAMENTS_MANAGE,
    PERMISSIONS.PLAYERS_READ,
  ],
  [ROLES.CONTENT_MANAGER]: [
    PERMISSIONS.MEDIA_READ,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_MANAGE,
  ],
  [ROLES.PUBLIC_USER]: [],
};

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: RoleSlug;
  permissions: PermissionSlug[];
  districtId?: string | null;
  isFederationWide?: boolean;
  isActive?: boolean;
}

export function hasPermission(
  user: SessionUser | null | undefined,
  permission: PermissionSlug
): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: SessionUser | null | undefined,
  permissions: PermissionSlug[]
): boolean {
  return permissions.some((p) => hasPermission(user, p));
}
