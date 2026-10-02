import { redirect } from "next/navigation";

/**
 * Sign-in no longer has an onboarding step: members land on the dashboard and
 * apply as a Player or Coach from those portals. Old links end up there too.
 */
export default function OnboardingPage() {
  redirect("/account/dashboard");
}
