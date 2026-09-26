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
  ShieldCheck,
  FileText,
  UserCog,
  ShoppingBag,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  User as UserIcon,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig, siteImages } from "@/shared/config/site";
import { LogoImage } from "@/shared/components/ui/media-image";
import { NotificationsBell } from "./notifications-bell";

const navSections = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/account/dashboard", icon: LayoutDashboard },
      { name: "My Applications", href: "/account/applications", icon: ClipboardList },
    ],
  },
  {
    title: "Registrations",
    items: [
      { name: "Player Portal", href: "/account/player", icon: UserCheck },
      { name: "Coach Portal", href: "/account/coach", icon: GraduationCap },
      { name: "Memberships", href: "/account/memberships", icon: Building2 },
    ],
  },
  {
    title: "Events & Records",
    items: [
      { name: "Tournaments", href: "/account/tournaments", icon: Trophy },
      { name: "Certificates", href: "/account/certificates", icon: Award },
      { name: "Verify Certificate", href: "/account/verify", icon: ShieldCheck },
    ],
  },
  {
    title: "Equipment",
    items: [
      { name: "My Orders", href: "/account/orders", icon: ShoppingBag },
      { name: "My Equipment", href: "/account/equipment", icon: Package },
    ],
  },
  {
    title: "Preferences",
    items: [
      { name: "My Profile", href: "/account/profile", icon: UserCog },
      { name: "Documents", href: "/account/documents", icon: FileText },
      { name: "Settings", href: "/account/settings", icon: Settings },
    ],
  },
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
    if (href === "/account/dashboard") return pathname === "/account/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle sidebar"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/account/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 p-1 border border-slate-100 shadow-xs">
              <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={36} maxWidth={36} />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold leading-tight text-primary">{siteConfig.shortName}</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                  <Sparkles className="h-2.5 w-2.5" /> Member
                </span>
              </div>
              <p className="text-xs text-slate-500">Rajasthan Racquetball Portal</p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs transition-all hover:border-primary hover:text-primary sm:flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Public Website
            </Link>

            <NotificationsBell />

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 p-1 pr-2.5 transition-all hover:border-primary hover:bg-white shadow-xs"
              >
                {avatar ? (
                  <Image src={avatar} alt={name} width={30} height={30} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white uppercase">
                    {initial}
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-xs font-semibold text-slate-700 sm:inline">{name.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-primary">{name}</p>
                      <p className="truncate text-xs text-slate-400">{email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/account/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                      >
                        <UserCog className="h-4 w-4 text-slate-400" /> My Profile
                      </Link>
                      <Link
                        href="/account/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                      >
                        <Settings className="h-4 w-4 text-slate-400" /> Settings & Security
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-30 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
                        active
                          ? "bg-primary text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                          active ? "text-white" : "text-slate-400 group-hover:text-primary"
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 bg-slate-50/50 p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs">
            {avatar ? (
              <Image src={avatar} alt={name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white uppercase">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-primary">{name}</p>
              <p className="truncate text-[10px] text-slate-400">{email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-20 bg-slate-900/40 backdrop-blur-xs lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
