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
  { name: "My Profile", href: "/account/profile", icon: UserCog },
  { name: "Settings", href: "/account/settings", icon: Settings },
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
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            className="rounded-md p-2 text-primary lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle sidebar"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/account/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={36} maxWidth={36} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight text-primary">{siteConfig.shortName}</p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-accent">Member Portal</p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-primary sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Website
            </Link>

            <NotificationsBell />

            <div className="relative">
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
                <span className="hidden max-w-[140px] truncate text-sm font-medium text-primary sm:inline">{name}</span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
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
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-secondary/10 text-secondary"
                  : "text-slate-700 hover:bg-slate-50 hover:text-primary"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <p className="truncate px-3 text-sm font-medium text-primary">{name}</p>
          <p className="mb-2 truncate px-3 text-xs text-slate-400">{email}</p>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Website
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-secondary hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-20 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
