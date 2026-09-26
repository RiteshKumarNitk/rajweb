import Link from "next/link";
import { Mail, MailOpen } from "lucide-react";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { listContactMessages } from "@/modules/contact/contact-admin.service";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, "ACTIVE" | "PENDING" | "REJECTED" | "EXPIRED"> = {
  NEW: "PENDING",
  READ: "PENDING",
  REPLIED: "ACTIVE",
  CLOSED: "EXPIRED",
};

export default async function AdminContactPage() {
  await requireAdminScope(PERMISSIONS.CONTACT_READ);

  let messages: Awaited<ReturnType<typeof listContactMessages>> = [];
  try {
    messages = await listContactMessages();
  } catch {
    messages = [];
  }

  const newCount = messages.filter((m) => m.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">Contact Messages</h1>
          {newCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {newCount} new
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">
          Messages submitted through the public Contact Us form. Each submission also emails the configured
          Super Admin address.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Received</th>
              <th className="px-4 py-3 font-semibold">Email</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No contact messages yet.
                </td>
              </tr>
            ) : (
              messages.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <StatusBadge status={STATUS_STYLES[m.status] ?? "PENDING"} label={m.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/admin/contact/${m.id}`} className="flex items-center gap-2 hover:text-secondary">
                      {m.status === "NEW" ? (
                        <Mail className="h-4 w-4 text-secondary" aria-label="Unread" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-slate-300" aria-label="Read" />
                      )}
                      {m.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email}</td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">
                    <span className="line-clamp-1">{m.subject || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        m.emailSent ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {m.emailSent ? "Notified" : "Not sent"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
