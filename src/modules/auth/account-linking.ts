import prisma from "@/infrastructure/database/prisma";
import { ROLES } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";

export type PublicSignupProvider = "GOOGLE" | "OTP_EMAIL";

interface FindOrCreateInput {
  email: string;
  name?: string | null;
  avatar?: string | null;
  googleId?: string | null;
  provider: PublicSignupProvider;
}

export interface AccountLinkingResult {
  user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null;
  /** Set when an existing password-based (admin) account owns this email — sign-in must be refused. */
  conflict: boolean;
}

/**
 * Shared find-or-create for both public-user auth paths (Google OAuth, email
 * OTP). An email that already belongs to a CREDENTIALS (admin) account is
 * never silently taken over by a weaker-verified public login — that account
 * must stay password-only unless a Super Admin changes it directly.
 */
export async function findOrCreatePublicUser(input: FindOrCreateInput): Promise<AccountLinkingResult> {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (existing) {
    if (existing.authProvider === "CREDENTIALS") {
      return { user: null, conflict: true };
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: input.name?.trim() || existing.name,
        avatar: input.avatar ?? existing.avatar,
        googleId: input.googleId ?? existing.googleId,
      },
      include: { role: true },
    });
    return { user: updated, conflict: false };
  }

  let publicRole = await prisma.role.findUnique({ where: { slug: ROLES.PUBLIC_USER } });
  if (!publicRole) {
    try {
      publicRole = await prisma.role.create({
        data: {
          name: "Public User",
          slug: ROLES.PUBLIC_USER,
          description: "Registered public user account",
        },
      });
    } catch {
      publicRole = await prisma.role.findUnique({ where: { slug: ROLES.PUBLIC_USER } });
    }
  }
  if (!publicRole) {
    throw new Error("Unable to initialize public-user role.");
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: input.name?.trim() || email,
      avatar: input.avatar ?? undefined,
      googleId: input.googleId ?? undefined,
      authProvider: input.provider,
      emailVerified: new Date(),
      roleId: publicRole.id,
      isActive: true,
    },
    include: { role: true },
  });

  try {
    await createAuditLog({
      userId: created.id,
      action: "CREATE",
      module: "users",
      entityId: created.id,
      details: { provider: input.provider, email },
    });
  } catch {
    // never block signup on an audit-log write failure
  }

  return { user: created, conflict: false };
}
