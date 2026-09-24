"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  GraduationCap,
  Building2,
  Trophy,
  Award,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig, siteImages } from "@/shared/config/site";
import { LogoImage } from "@/shared/components/ui/media-image";
import { NotificationsBell } from "./notifications-bell";

const navItems = [
  { name: "Dashboard", href: "/account/dashboard", icon: LayoutDashboard },
  { name: "My Applications", href: "/account/applications", icon: ClipboardList },
  { name: "Player", href: "/account/player", icon: UserCheck },
  { name: "Coach", href: "/account/coach", icon: GraduationCap },
  { name: "Memberships", href: "/account/memberships", icon: Building2 },
  { name: "Tournaments", href: "/account/tournaments", icon: Trophy },
  { name: "Certificates", href: "/account/certificates", icon: Award },
  { name: "Documents", href: "/account/documents", icon: FileText },
];

export function PanelNavbar({
  name,
  email,
  avatar,
}: {
  name: string;
  email: string;
  avatar: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/account/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={36} maxWidth={36} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight text-primary">{siteConfig.shortName}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-accent">Member Portal</p>
            </div>
          </Link>
          <Link
            href="/"
            className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-primary lg:flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Website
          </Link>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md border-b-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isActive(item.href)
                  ? "border-accent text-primary"
                  : "border-transparent text-slate-600 hover:text-primary"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <NotificationsBell />

          <div className="relative hidden lg:block">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-50"
            >
              {avatar ? (
                <Image src={avatar} alt={name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-4 w-4" />
                </div>
              )}
              <span className="max-w-[120px] truncate text-sm font-medium text-primary">{name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="truncate text-sm font-medium text-primary">{name}</p>
                    <p className="truncate text-xs text-slate-400">{email}</p>
                  </div>
                  <Link
                    href="/account/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserCog className="h-4 w-4" /> My Profile
                  </Link>
                  <Link
                    href="/account/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-secondary hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            className="rounded-md p-2 text-primary lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-slate-200 bg-white lg:hidden",
          mobileOpen ? "max-h-[80vh] overflow-y-auto" : "max-h-0"
        )}
      >
        <nav className="space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                isActive(item.href) ? "bg-secondary/10 text-secondary" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
          <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
            <p className="px-3 py-1 text-xs text-slate-400">Signed in as {email}</p>
            <Link
              href="/account/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <UserCog className="h-4 w-4" /> My Profile
            </Link>
            <Link
              href="/account/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Website
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-secondary hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
