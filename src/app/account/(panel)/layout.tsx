import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";
import { PanelNavbar } from "./panel-navbar";
import { getRegistrationLocations } from "@/modules/districts/registration-locations.server";
import { RegistrationLocationsProvider } from "@/shared/components/forms/registration-locations-context";
import { getRegistrationChoice, REGISTRATION_KINDS } from "@/modules/applications/registration-choice.server";

export const dynamic = "force-dynamic";

export default async function AccountPanelLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  // No onboarding step: a new member lands on the dashboard and chooses ONE
  // registration — Player, Coach or Membership. The sidebar follows that choice.
  let dbUser = null;
  try {
    if (authUser.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, email: true, avatar: true },
      });
    }
  } catch (err) {
    console.error("[AccountPanelLayout] Error loading DB user profile:", err);
  }

  const name = dbUser?.name ?? authUser.name ?? "User";
  const email = dbUser?.email ?? authUser.email ?? "";
  const avatar = dbUser?.avatar ?? null;
  const registration = await getRegistrationChoice(authUser.id).catch(() => ({
    status: { player: null, coach: null, membership: null },
    allowed: [...REGISTRATION_KINDS],
  }));
  // Empty on DB failure — the forms then fall back to the static district list.
  const locations = await getRegistrationLocations().catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50">
      <PanelNavbar
        name={name}
        email={email}
        avatar={avatar}
        registration={{ status: registration.status, allowed: registration.allowed }}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <RegistrationLocationsProvider locations={locations}>{children}</RegistrationLocationsProvider>
        </div>
      </main>
    </div>
  );
}
