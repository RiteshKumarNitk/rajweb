"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Shield,
  ExternalLink,
  LogOut,
  User,
  Sparkles,
  ChevronDown,
  Bell,
  Settings,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { siteConfig } from "@/shared/config/site";

export function AdminHeader({
  districtName,
  onToggleSidebar,
}: {
  districtName?: string | null;
  onToggleSidebar: () => void;
}) {
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  const user = session?.user as {
    name?: string | null;
    email?: string | null;
    role?: string;
  } | undefined;

  const userName = user?.name || "Administrator";
  const userEmail = user?.email || "";
  const userRole = (user?.role || "Admin").replace(/_/g, " ").replace(/-/g, " ");
  const initial = userName ? userName.charAt(0).toUpperCase() : "A";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Toggle Navigation"
        >
          <Layers className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
              <Shield className="h-3.5 w-3.5 text-amber-400" /> RRA Admin
            </span>
            <span className="text-xs text-slate-400 font-medium">|</span>
            <span className="text-xs font-semibold text-slate-600">
              {districtName ? `${districtName} District Unit` : "State Federation Directorate"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs transition-all hover:border-primary hover:text-primary sm:flex"
        >
          Public Website <ExternalLink className="h-3 w-3 text-slate-400" />
        </Link>

        {/* Admin Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-2.5 transition-all hover:border-primary hover:bg-white shadow-2xs"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white uppercase shadow-2xs">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              <p className="max-w-[120px] truncate text-xs font-bold text-slate-800 leading-tight">
                {userName.split(" ")[0]}
              </p>
              <p className="text-[10px] text-slate-400 leading-none capitalize">
                {userRole}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-bold text-primary">{userName}</p>
                  <p className="truncate text-xs text-slate-400">{userEmail}</p>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 capitalize">
                    <Sparkles className="h-2.5 w-2.5 text-amber-600" /> {userRole}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    href="/account/dashboard"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                  >
                    <User className="h-4 w-4 text-slate-400" /> Member Dashboard
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary"
                  >
                    <Settings className="h-4 w-4 text-slate-400" /> Federation Settings
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out of Admin
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
