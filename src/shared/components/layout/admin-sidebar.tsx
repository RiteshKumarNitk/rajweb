"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Newspaper,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Building2,
  FileText,
  MapPin,
  Award,
  ScrollText,
  ShoppingBag,
  KeyRound,
  ClipboardCheck,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  type PermissionSlug,
} from "@/security/rbac/permissions";
import { LogoImage } from "@/shared/components/ui/media-image";
import { siteConfig, siteImages } from "@/shared/config/site";

interface NavGroup {
  title: string;
  items: {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
    permission?: PermissionSlug;
    permissions?: PermissionSlug[];
    badge?: string;
  }[];
}

const navSections: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
      {
        name: "Review Applications",
        href: "/admin/applications",
        icon: ClipboardCheck,
        permissions: [
          PERMISSIONS.PLAYERS_READ,
          PERMISSIONS.COACHES_READ,
          PERMISSIONS.MEMBERSHIPS_READ,
        ],
      },
      {
        name: "Service Requests",
        href: "/admin/requests",
        icon: MessageSquare,
        permission: PERMISSIONS.REQUESTS_VIEW,
      },
    ],
  },
  {
    title: "Federation Members",
    items: [
      { name: "Players", href: "/admin/players", icon: UserCheck, permission: PERMISSIONS.PLAYERS_READ },
      { name: "Coaches", href: "/admin/coaches", icon: GraduationCap, permission: PERMISSIONS.COACHES_READ },
      { name: "Memberships", href: "/admin/memberships", icon: Building2, permission: PERMISSIONS.MEMBERSHIPS_READ },
      { name: "Districts", href: "/admin/districts", icon: MapPin, permission: PERMISSIONS.DISTRICTS_READ },
    ],
  },
  {
    title: "Events & Records",
    items: [
      { name: "Tournaments", href: "/admin/tournaments", icon: Trophy, permission: PERMISSIONS.TOURNAMENTS_READ },
      { name: "Certificates", href: "/admin/certificates", icon: Award, permission: PERMISSIONS.CERTIFICATES_READ },
      { name: "Equipment Orders", href: "/admin/equipment-orders", icon: ShoppingBag, permission: PERMISSIONS.EQUIPMENT_READ },
    ],
  },
  {
    title: "Media & Content",
    items: [
      { name: "Media CMS", href: "/admin/media", icon: Newspaper, permission: PERMISSIONS.MEDIA_READ },
    ],
  },
  {
    title: "System & Governance",
    items: [
      { name: "User Accounts", href: "/admin/users", icon: Users, permission: PERMISSIONS.USERS_READ },
      { name: "Roles & RBAC", href: "/admin/roles", icon: KeyRound, permission: PERMISSIONS.ROLES_READ },
      { name: "Audit Trail", href: "/admin/audit-logs", icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
      { name: "Settings", href: "/admin/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];

export function AdminSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user as {
    role?: string;
    permissions?: PermissionSlug[];
    name?: string;
    email?: string;
  } | undefined;

  const sessionUser = user as Parameters<typeof hasPermission>[0];

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "A";

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 p-1 shadow-xs">
              <LogoImage src={siteImages.logo} alt={siteConfig.name} maxHeight={32} maxWidth={32} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white">RRA Directorate</span>
                <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400 uppercase tracking-wider border border-amber-400/30">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Rajasthan Racquetball</p>
            </div>
          </Link>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.permissions) return hasAnyPermission(sessionUser, item.permissions);
              return !item.permission || hasPermission(sessionUser, item.permission);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-0.5 pt-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150",
                          active
                            ? "bg-secondary text-white shadow-xs font-bold"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                              active ? "text-white" : "text-slate-400 group-hover:text-amber-400"
                            )}
                          />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card in Footer */}
        <div className="border-t border-slate-800/80 bg-slate-900/40 p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/80 p-2.5 shadow-2xs">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-amber-400 uppercase border border-slate-700">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{user?.name || "Admin"}</p>
              <p className="truncate text-[10px] text-slate-400 capitalize">
                {(user?.role || "Administrator").replace(/_/g, " ").replace(/-/g, " ")}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}
    </>
  );
}
