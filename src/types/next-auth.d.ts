import "next-auth";
import type { RoleSlug } from "@/security/rbac/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: RoleSlug;
      permissions: string[];
      districtId?: string | null;
      isFederationWide: boolean;
      isActive: boolean;
    };
  }

  // What a provider's authorize()/profile mapping actually returns on
  // initial sign-in — just enough to identify the person. Role, permissions,
  // district, and active status are resolved from the DB in the jwt
  // callback on every request, not carried here (see auth.ts).
  interface User {
    id: string;
    email: string;
    name: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleSlug;
    permissions: string[];
    districtId?: string | null;
    isFederationWide: boolean;
    isActive: boolean;
    authCheckedAt?: number;
  }
}

export {};
