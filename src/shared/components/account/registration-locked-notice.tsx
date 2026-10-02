import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  REGISTRATION_KIND_LABELS,
  registrationLockedMessage,
  type RegistrationChoice,
  type RegistrationKind,
} from "@/modules/applications/registration-choice.server";

const PORTALS: Record<RegistrationKind, { href: string; label: string }> = {
  player: { href: "/account/player", label: "Open your Player registration" },
  coach: { href: "/account/coach", label: "Open your Coach registration" },
  membership: { href: "/account/memberships", label: "Open your Membership" },
};

/**
 * Shown instead of a registration page the account may not use (it already
 * holds another registration). The APIs refuse the same requests.
 */
export function RegistrationLockedNotice({ requested, choice }: { requested: RegistrationKind; choice: RegistrationChoice }) {
  const portal = choice.primary ? PORTALS[choice.primary] : null;
  return (
    <Card className="mx-auto max-w-2xl" data-testid="registration-locked">
      <CardContent className="space-y-4 p-6 text-center sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Lock className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-primary">{REGISTRATION_KIND_LABELS[requested]} registration is not available</h1>
          <p className="text-sm text-slate-500">{registrationLockedMessage(choice)}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {portal && (
            <Button size="sm" asChild>
              <Link href={portal.href}>{portal.label}</Link>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/account/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
