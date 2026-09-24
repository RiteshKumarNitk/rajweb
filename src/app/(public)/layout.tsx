import { Header, Footer } from "@/shared/components/layout";

/** Pre-render all public pages at build — instant CDN navigation. */
export const dynamic = "force-static";
export const revalidate = 86400;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
