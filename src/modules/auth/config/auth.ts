import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import prisma from "@/infrastructure/database/prisma";
import type { RoleSlug } from "@/security/rbac/permissions";
import { getPermissionsForRole } from "@/security/rbac/role-permissions.server";
import { findOrCreatePublicUser } from "@/modules/auth/account-linking";
import { verifyOtp } from "@/services/email/otp-service";
import { createAuditLog } from "@/services/audit/audit-service";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive || !user.passwordHash) return null;

        const isValid = await compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const isValid = await verifyOtp(email, credentials.otp as string);
        if (!isValid) return null;

        const { user, conflict } = await findOrCreatePublicUser({ email, provider: "OTP_EMAIL" });
        if (conflict || !user || !user.isActive) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email) return "/account/login?error=missing_email";

      const googleProfile = profile as { sub?: string; name?: string; picture?: string };

      const { user, conflict } = await findOrCreatePublicUser({
        email: profile.email,
        name: googleProfile.name,
        avatar: googleProfile.picture,
        googleId: googleProfile.sub,
        provider: "GOOGLE",
      });

      if (conflict) return "/account/login?error=account_exists_with_password";
      if (!user || !user.isActive) return "/account/login?error=inactive";

      return true;
    },
    // Runs on every request that reads the session, not just initial sign-in
    // — role/permissions/active-status/district are re-fetched from the DB
    // each time so a Super Admin's change (deactivate, reassign role/district)
    // takes effect on the user's next request instead of waiting out the
    // 30-minute session lifetime.
    async jwt({ token, user, account }) {
      if (user?.email) {
        token.email = user.email;
      }

      const email = token.email as string | undefined;
      if (!email) return token;

      const dbUser = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (!dbUser || !dbUser.isActive) {
        token.isActive = false;
        return token;
      }

      const permissions = await getPermissionsForRole(dbUser.roleId);

      token.id = dbUser.id;
      token.name = dbUser.name;
      token.role = dbUser.role.slug as RoleSlug;
      token.permissions = permissions;
      token.districtId = dbUser.districtId;
      token.isFederationWide = dbUser.isFederationWide;
      token.isActive = true;

      if (user) {
        // This is the initial sign-in for this token — record it once.
        try {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastLoginAt: new Date() },
          });
          await createAuditLog({
            userId: dbUser.id,
            action: "LOGIN",
            module: "auth",
            details: { email: dbUser.email, provider: account?.provider ?? "credentials" },
          });
        } catch {
          // DB may be briefly unavailable — never block login on this
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as RoleSlug;
        session.user.permissions = token.permissions as string[];
        session.user.districtId = token.districtId as string | null;
        session.user.isFederationWide = token.isFederationWide as boolean;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
});
