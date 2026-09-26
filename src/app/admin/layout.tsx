import { SessionProvider } from "@/shared/components/providers/session-provider";
import { AdminShell } from "@/shared/components/layout/admin-shell";
import { getCurrentUser } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getCurrentUser();
  let districtName: string | null = null;

  if (authUser?.districtId) {
    try {
      const district = await prisma.district.findUnique({
        where: { id: authUser.districtId },
        select: { name: true },
      });
      districtName = district?.name ?? null;
    } catch {
      districtName = null;
    }
  }

  return (
    <SessionProvider>
      <AdminShell districtName={districtName}>
        {children}
      </AdminShell>
    </SessionProvider>
  );
}
