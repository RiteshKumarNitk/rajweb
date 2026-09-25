"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isStaticReleaseMode } from "@/shared/lib/static-release";
import { HeaderAuthSession, MobileHeaderAuthSession } from "@/shared/components/layout/header-auth-session";

function StaticHeaderAuth() {
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

function StaticMobileHeaderAuth({ onNavigate }: { onNavigate?: () => void }) {
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

export function HeaderAuth() {
  if (isStaticReleaseMode()) {
    return <StaticHeaderAuth />;
  }
  return <HeaderAuthSession />;
}

export function MobileHeaderAuth({ onNavigate }: { onNavigate?: () => void }) {
  if (isStaticReleaseMode()) {
    return <StaticMobileHeaderAuth onNavigate={onNavigate} />;
  }
  return <MobileHeaderAuthSession onNavigate={onNavigate} />;
}
