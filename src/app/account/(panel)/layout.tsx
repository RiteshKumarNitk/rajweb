import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";
import { PanelNavbar } from "./panel-navbar";

export const dynamic = "force-dynamic";

export default async function AccountPanelLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { name: true, email: true, avatar: true },
  });
  if (!user) redirect("/account/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <PanelNavbar name={user.name} email={user.email} avatar={user.avatar} />
      <main>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
