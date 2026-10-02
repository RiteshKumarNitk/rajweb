import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { Card, CardContent } from "@/shared/components/ui/card";
import { RequestsPanel } from "@/shared/components/requests/requests-panel";
import { getOwnRequestRows } from "@/modules/requests/own-requests.server";
import { requireOwnPlayer } from "../require-own-player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Change Requests" };

/**
 * Changes to an approved Player profile go through the existing request
 * workflow (district changes included) — reviewed by the district, the state
 * or the Super Admin, who apply them. The player only sees and creates requests.
 */
export default async function PlayerRequestsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { authUser, player } = await requireOwnPlayer();
  const { new: openNew } = await searchParams;

  if (player.status !== "APPROVED") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-600">
          <ClipboardList className="h-5 w-5 text-slate-400" />
          Change requests are available once your player registration is approved.
          {player.status === "REJECTED" ? " Until then, correct and resubmit your application from the Profile tab." : ""}
        </CardContent>
      </Card>
    );
  }

  const [rows, profile] = await Promise.all([
    getOwnRequestRows(authUser.id, { playerId: player.id }),
    prisma.userProfile.findUnique({ where: { userId: authUser.id }, select: { address: true } }),
  ]);

  return (
    <div className="-mt-6">
      <RequestsPanel
        profileType="player"
        startOpen={openNew === "1"}
        current={{
          name: player.name,
          email: player.email,
          mobile: player.mobile,
          district: player.district.name,
          dateOfBirth: player.dateOfBirth.toISOString().slice(0, 10),
          gender: player.gender,
          category: player.category,
          address: profile?.address ?? null,
        }}
        requests={rows}
      />
    </div>
  );
}
