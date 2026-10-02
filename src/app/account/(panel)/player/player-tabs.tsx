"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCheck, Trophy, Award, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/account/player", label: "Profile", icon: UserCheck },
  { href: "/account/player/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/account/player/certificates", label: "Certificates", icon: Award },
  { href: "/account/player/requests", label: "Change Requests", icon: ClipboardList },
];

/** Player area navigation: Profile · Tournaments · Certificates · Change Requests. */
export function PlayerTabs({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs" aria-label="Player sections">
      {TABS.map((tab) => {
        const active = tab.href === "/account/player" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50 hover:text-primary"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.href === "/account/player/requests" && pendingRequests > 0 && (
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active ? "bg-white/20" : "bg-amber-100 text-amber-800")}>
                {pendingRequests}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
