"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { isStaticReleaseMode } from "@/shared/lib/static-release";
import { HeaderAuthSession, MobileHeaderAuthSession } from "@/shared/components/layout/header-auth-session";

function StaticHeaderAuth() {
  return (
    <Button size="sm" className="hidden lg:inline-flex" asChild>
      <Link href="/account/login" prefetch>
        <LogIn className="mr-1.5 h-4 w-4" />
        Login / Sign Up
      </Link>
    </Button>
  );
}

function StaticMobileHeaderAuth({ onNavigate }: { onNavigate?: () => void }) {
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
