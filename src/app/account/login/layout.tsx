import { SessionProvider } from "@/shared/components/providers/session-provider";

export default function AccountLoginLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
