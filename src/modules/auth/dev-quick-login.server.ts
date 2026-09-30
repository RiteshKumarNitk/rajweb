import { readFile } from "fs/promises";
import prisma from "@/infrastructure/database/prisma";

/**
 * One-click admin sign-in for `next dev` only. Passwords never reach the
 * browser: the page gets e-mails and labels, and the sign-in happens on the
 * server (see app/login/actions.ts). Production builds return nothing.
 *
 * Credentials come from the file named by RRA_QUICK_LOGIN_FILE (lines of
 * "role | email | password", e.g. the private credentials file kept outside
 * the repository). Without it, a local database falls back to the seed
 * accounts and their seed passwords.
 */

export interface QuickLoginAccount {
  email: string;
  role: string;
  label: string;
  description: string;
}

const ROLE_ORDER = ["super-admin", "federation-admin", "state-admin", "district-admin", "tournament-manager", "content-manager"];

function isLocalDatabase(): boolean {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL ?? "").hostname);
  } catch {
    return false;
  }
}

async function loadCredentials(): Promise<Map<string, string>> {
  const credentials = new Map<string, string>();
  if (process.env.NODE_ENV !== "development") return credentials;

  const file = process.env.RRA_QUICK_LOGIN_FILE;
  if (file) {
    try {
      for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
        const [, email, password] = line.split(" | ").map((part) => part?.trim());
        if (email?.includes("@") && password) credentials.set(email.toLowerCase(), password);
      }
    } catch {
      // Missing/unreadable file: no quick-login buttons.
    }
    return credentials;
  }

  if (isLocalDatabase()) {
    const seed: [string, string][] = [
      ["admin@rajasthanracquetball.com", "Admin@123"],
      ["state.rajasthan@rajasthanracquetball.com", "State@123"],
      ["district.jaipur@rajasthanracquetball.com", "District@123"],
      ["district.kota@rajasthanracquetball.com", "District@123"],
      ["tournaments@rajasthanracquetball.com", "Tournament@123"],
      ["content@rajasthanracquetball.com", "Content@123"],
    ];
    for (const [email, password] of seed) credentials.set(email, password);
  }
  return credentials;
}

/** Active admin accounts that have a known credential, with their scope, for the buttons. */
export async function getQuickLoginAccounts(): Promise<QuickLoginAccount[]> {
  if (process.env.NODE_ENV !== "development") return [];
  const credentials = await loadCredentials();
  if (credentials.size === 0) return [];

  const users = await prisma.user.findMany({
    where: { email: { in: [...credentials.keys()] }, isActive: true, role: { slug: { not: "public-user" } } },
    select: {
      email: true,
      isFederationWide: true,
      role: { select: { slug: true, name: true } },
      state: { select: { name: true } },
      district: { select: { name: true, state: { select: { name: true } } } },
    },
  });

  return users
    .map((u) => {
      const scope =
        u.role.slug === "super-admin" || u.isFederationWide
          ? "All states"
          : u.district
            ? [u.district.name, u.district.state?.name].filter(Boolean).join(", ")
            : u.state?.name ?? "No state or district assigned";
      // Seeded role names are stored upper-case ("DISTRICT ADMIN"); show them as "District Admin".
      const label =
        u.role.name === u.role.name.toUpperCase()
          ? u.role.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
          : u.role.name;
      return { email: u.email, role: u.role.slug, label, description: scope };
    })
    .sort(
      (a, b) =>
        (ROLE_ORDER.indexOf(a.role) + 1 || 99) - (ROLE_ORDER.indexOf(b.role) + 1 || 99) ||
        a.description.localeCompare(b.description) ||
        a.email.localeCompare(b.email)
    );
}

/** Server-side lookup used by the quick-login action; null outside development. */
export async function getQuickLoginPassword(email: string): Promise<string | null> {
  if (process.env.NODE_ENV !== "development") return null;
  return (await loadCredentials()).get(email.trim().toLowerCase()) ?? null;
}
