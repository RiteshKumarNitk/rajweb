import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/security/auth/session";
import { RequestsPanel } from "@/shared/components/requests/requests-panel";
import { getOwnRequestRows } from "@/modules/requests/own-requests.server";
import { getRegistrationChoice } from "@/modules/applications/registration-choice.server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Requests" };

/**
 * Every request the signed-in member has made (Player and Coach), with
 * cancellation while pending. New requests are raised from the registration
 * they concern.
 */
export default async function AccountRequestsPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [rows, registration] = await Promise.all([getOwnRequestRows(authUser.id), getRegistrationChoice(authUser.id)]);
  const portal =
    registration.status.player === "APPROVED"
      ? { href: "/account/player/requests?new=1", label: "New Player request" }
      : registration.status.coach === "APPROVED"
        ? { href: "/account/coach", label: "New Coach request" }
        : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">My Requests</h1>
          <p className="text-sm text-slate-500">Change and service requests you have sent to the association.</p>
        </div>
        {portal && (
          <Link href={portal.href} className="text-sm font-semibold text-secondary hover:underline">
            {portal.label} →
          </Link>
        )}
      </div>
      <RequestsPanel requests={rows} title="All Requests" />
    </div>
  );
}
