import { Suspense } from "react";
import { getQuickLoginAccounts } from "@/modules/auth/dev-quick-login.server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Development only (empty in production builds); e-mails and labels, no passwords.
  const quickAccounts = await getQuickLoginAccounts();

  return (
    <Suspense>
      <LoginForm quickAccounts={quickAccounts} />
    </Suspense>
  );
}
