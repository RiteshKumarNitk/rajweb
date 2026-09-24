"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

/**
 * UI shell only — no Notification model/backend exists yet in the schema.
 * Wired so a future phase can drop real data in without touching this
 * component's structure: swap the empty-state paragraph for a mapped list.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-50 hover:text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <div className="border-b border-slate-100 px-4 py-2">
              <p className="text-sm font-semibold text-primary">Notifications</p>
            </div>
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-500">No notifications yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                You&apos;ll see updates here about your applications and certificates.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
