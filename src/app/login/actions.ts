"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/modules/auth/config/auth";
import { getQuickLoginPassword } from "@/modules/auth/dev-quick-login.server";

/**
 * Development-only one-click sign-in: the password is looked up and checked on
 * the server, never sent to the browser. Reachable by direct POST like any
 * Server Function, so it re-checks the environment and the account itself.
 */
export async function quickLogin(email: string): Promise<{ error?: string }> {
  if (process.env.NODE_ENV !== "development") return { error: "Quick login is only available in development." };

  const password = await getQuickLoginPassword(email);
  if (!password) return { error: "No quick-login credential for this account." };

  try {
    await signIn("credentials", { email, password, redirect: false });
    return {};
  } catch (err) {
    if (err instanceof AuthError) return { error: "Sign-in failed — the stored password may be out of date." };
    throw err;
  }
}
