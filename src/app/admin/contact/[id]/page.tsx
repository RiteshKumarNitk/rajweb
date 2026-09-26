import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminScope } from "@/security/rbac/admin-scope";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { getContactMessage } from "@/modules/contact/contact-admin.service";
import { ContactStatusActions } from "./contact-status-actions";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminContactDetailPage({
  params,
}: {
  params?: Promise<{ id?: string }>;
}) {
  await requireAdminScope(PERMISSIONS.CONTACT_READ);
  const { id } = (await params) ?? {};
  if (!id) {
    return <p className="text-sm text-slate-500">Contact message ID missing.</p>;
  }

  let message;
  try {
    message = await getContactMessage(id);
  } catch {
    return <p className="text-sm text-slate-500">Contact message not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/contact" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Contact Messages
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-primary">{message.subject || "(no subject)"}</h1>
              <StatusBadge status={message.status === "REPLIED" ? "ACTIVE" : message.status === "CLOSED" ? "EXPIRED" : "PENDING"} label={message.status} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Received {formatDate(message.createdAt)} ·{" "}
              {message.emailSent ? "Super Admin notified by email" : "Email notification not sent"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From</p>
            <p className="text-sm font-medium text-slate-800">{message.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
            <a href={`mailto:${message.email}`} className="text-sm text-secondary hover:underline">
              {message.email}
            </a>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
            <p className="text-sm text-slate-800">{message.phone || "—"}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Message</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{message.message}</p>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <ContactStatusActions messageId={message.id} currentStatus={message.status} />
        </div>
      </div>
    </div>
  );
}
