import { AdminSidebar } from "@/shared/components/layout/admin-sidebar";
import { SessionProvider } from "@/shared/components/providers/session-provider";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <main className="lg:pl-64">
          <div className="p-6 pt-16 lg:pt-6">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
