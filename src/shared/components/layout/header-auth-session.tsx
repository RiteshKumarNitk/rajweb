"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, LogIn, LogOut, User } from "lucide-react";
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
      <Button variant="ghost" size="sm" disabled className="hidden lg:inline-flex">
        ...
      </Button>
    );
  }

  if (session?.user && isAdminRole(role)) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <span className="max-w-[140px] truncate text-xs text-slate-500" title={session.user.email ?? undefined}>
          {session.user.name}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin" prefetch>
            <LayoutDashboard className="mr-1.5 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="hidden items-center gap-2 lg:flex">
        <span className="max-w-[140px] truncate text-xs text-slate-500" title={session.user.email ?? undefined}>
          {session.user.name}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account/dashboard" prefetch>
            <User className="mr-1.5 h-4 w-4" />
            My Account
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-1.5 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" className="hidden lg:inline-flex" asChild>
      <Link href="/account/login" prefetch>
        <LogIn className="mr-1.5 h-4 w-4" />
        Login / Sign Up
      </Link>
    </Button>
  );
}

export function MobileHeaderAuthSession({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session, status } = useSession();
  const role = session?.user?.role as string | undefined;

  if (status === "loading") return null;

  if (session?.user && isAdminRole(role)) {
    return (
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
        <p className="px-1 text-xs text-slate-500">Signed in as {session.user.name}</p>
        <Button variant="outline" asChild onClick={onNavigate}>
          <Link href="/admin" prefetch>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Admin Dashboard
          </Link>
        </Button>
        <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-4">
        <p className="px-1 text-xs text-slate-500">Signed in as {session.user.name}</p>
        <Button variant="outline" asChild onClick={onNavigate}>
          <Link href="/account/dashboard" prefetch>
            <User className="mr-2 h-4 w-4" />
            My Account
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
    <div className="border-t border-slate-200 pt-4">
      <Button variant="outline" className="w-full" asChild onClick={onNavigate}>
        <Link href="/account/login" prefetch>
          <LogIn className="mr-2 h-4 w-4" />
          Login / Sign Up
        </Link>
      </Button>
    </div>
  );
}
