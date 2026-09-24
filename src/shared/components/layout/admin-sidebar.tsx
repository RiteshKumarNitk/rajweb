"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Trophy, Newspaper, Shield, Settings,
  LogOut, Menu, X, UserCheck, GraduationCap, Building2, FileText,
  MapPin, Award, ScrollText, ShoppingBag, KeyRound, ClipboardCheck, MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { PERMISSIONS, hasPermission, hasAnyPermission, type PermissionSlug } from "@/security/rbac/permissions";

const navItems: { name: string; href: string; icon: typeof LayoutDashboard; permission?: PermissionSlug; permissions?: PermissionSlug[] }[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  {
    name: "Applications",
    href: "/admin/applications",
    icon: ClipboardCheck,
    permissions: [PERMISSIONS.PLAYERS_READ, PERMISSIONS.COACHES_READ, PERMISSIONS.MEMBERSHIPS_READ],
  },
  { name: "Requests", href: "/admin/requests", icon: MessageSquare, permission: PERMISSIONS.REQUESTS_VIEW },
  { name: "Players", href: "/admin/players", icon: UserCheck, permission: PERMISSIONS.PLAYERS_READ },
  { name: "Coaches", href: "/admin/coaches", icon: GraduationCap, permission: PERMISSIONS.COACHES_READ },
  { name: "Memberships", href: "/admin/memberships", icon: Building2, permission: PERMISSIONS.MEMBERSHIPS_READ },
  { name: "Tournaments", href: "/admin/tournaments", icon: Trophy, permission: PERMISSIONS.TOURNAMENTS_READ },
  { name: "Media", href: "/admin/media", icon: Newspaper, permission: PERMISSIONS.MEDIA_READ },
  { name: "Equipment Orders", href: "/admin/equipment-orders", icon: ShoppingBag },
  { name: "Certificates", href: "/admin/certificates", icon: Award, permission: PERMISSIONS.CERTIFICATES_READ },
  { name: "Districts", href: "/admin/districts", icon: MapPin, permission: PERMISSIONS.DISTRICTS_READ },
  { name: "Users", href: "/admin/users", icon: Users, permission: PERMISSIONS.USERS_READ },
  { name: "Roles", href: "/admin/roles", icon: KeyRound, permission: PERMISSIONS.ROLES_READ },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
  { name: "Settings", href: "/admin/settings", icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user as { role?: string; permissions?: PermissionSlug[]; name?: string; email?: string } | undefined;
  const visibleNav = navItems.filter((item) => {
    const sessionUser = user as Parameters<typeof hasPermission>[0];
    if (item.permissions) return hasAnyPermission(sessionUser, item.permissions);
    return !item.permission || hasPermission(sessionUser, item.permission);
  });

  return (
    <>
      <button
        className="fixed left-4 top-4 z-50 rounded-md bg-primary p-2 text-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <Shield className="h-7 w-7 text-accent" />
          <div>
            <p className="text-sm font-bold text-white">RRA Admin</p>
            <p className="text-xs text-slate-400">{user?.role?.replace(/-/g, " ")}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
          <Link
            href="/"
            className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            <FileText className="h-5 w-5" />
            View Website
          </Link>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
