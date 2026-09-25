"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ROLES } from "@/security/rbac/permissions";

export { signOut };

function isAdminRole(role: string | undefined): boolean {
  return Boolean(role) && role !== ROLES.PUBLIC_USER;
}

export function HeaderAuthSession() {
  const { data: session, status } = useSession();
  const role = session?.user?.role as string | undefined;

  if (status === "loading") {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
    );
  }

  if (session?.user) {
    const isAdmin = isAdminRole(role);
    const targetDashboard = isAdmin ? "/admin" : "/account/dashboard";
    const initial = session.user.name?.charAt(0) || "U";
    const firstName = session.user.name?.split(" ")[0] || "Account";

    return (
      <div className="flex items-center gap-1.5">
        <Link
          href={targetDashboard}
          prefetch
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 py-1 pl-1 pr-3 text-xs font-medium text-slate-700 transition-all hover:border-primary hover:bg-white hover:text-primary shadow-xs"
          title={session.user.name ?? "Dashboard"}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white uppercase">
            {initial}
          </div>
          <span className="max-w-[100px] truncate">{firstName}</span>
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/account/login"
      prefetch
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-200 hover:border-primary hover:bg-primary hover:text-white active:scale-95"
      title="Login / Sign Up"
      aria-label="Login / Sign Up"
    >
      <User className="h-4.5 w-4.5" />
    </Link>
  );
}

export function MobileHeaderAuthSession({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role as string | undefined;

  if (status === "loading") return null;

  if (session?.user) {
    const isAdmin = isAdminRole(role);
    const targetDashboard = isAdmin ? "/admin" : "/account/dashboard";
    const label = isAdmin ? "Admin Dashboard" : "My Account Dashboard";

    return (
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
        <p className="px-1 text-xs text-slate-500">Signed in as <span className="font-semibold text-primary">{session.user.name}</span></p>
        <Button variant="outline" asChild onClick={onNavigate}>
          <Link href={targetDashboard} prefetch>
            <User className="mr-2 h-4 w-4" />
            {label}
          </Link>
        </Button>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-100 pt-3">
      <Button variant="outline" className="w-full" asChild onClick={onNavigate}>
        <Link href="/account/login" prefetch>
          <User className="mr-2 h-4 w-4" />
          Login / Sign Up
        </Link>
      </Button>
    </div>
  );
}
