import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, School, Landmark, ChevronRight, CheckCircle2, PlusCircle } from "lucide-react";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/status-badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Memberships & Institutional Affiliation",
  description: "Apply for or manage your club, school, and academy affiliation with Rajasthan Racquetball Association.",
};

export default async function AccountMembershipsIndexPage() {
  const authUser = await getCurrentUser();
  if (!authUser) redirect("/account/login");

  const [club, school, academy] = await Promise.all([
    prisma.clubMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.schoolMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
    prisma.academyMembership.findFirst({
      where: { OR: [{ userId: authUser.id }, { user: { email: authUser.email ?? "" } }] },
    }),
  ]);

  const items = [
    {
      type: "Club Affiliation",
      desc: "Sports clubs & recreational organizations",
      href: "/account/memberships/club",
      icon: Building2,
      accentColor: "from-blue-600 to-indigo-600",
      record: club,
      name: club?.clubName,
    },
    {
      type: "School Affiliation",
      desc: "Primary, secondary, and higher secondary schools",
      href: "/account/memberships/school",
      icon: School,
      accentColor: "from-amber-500 to-amber-600",
      record: school,
      name: school?.schoolName,
    },
    {
      type: "Academy Affiliation",
      desc: "Private training academies and specialized coaching centers",
      href: "/account/memberships/academy",
      icon: Landmark,
      accentColor: "from-emerald-500 to-teal-600",
      record: academy,
      name: academy?.academyName,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          Memberships & Institutional Affiliation
        </h1>
        <p className="text-sm text-slate-500">
          Apply for or manage state affiliation for your racquetball club, school, or sports academy.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {items.map((item) => (
          <Card
            key={item.href}
            className="overflow-hidden border-slate-200/80 transition-all hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className={`h-2 w-full bg-gradient-to-r ${item.accentColor}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  {item.record && <StatusBadge status={item.record.status} />}
                </div>
                <CardTitle className="text-base pt-2">{item.type}</CardTitle>
                <CardDescription className="text-xs">{item.desc}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 text-xs">
                {item.record ? (
                  <div className="rounded-lg bg-slate-50 p-3 space-y-1.5 border border-slate-100">
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Affiliated Entity</p>
                    <p className="font-bold text-slate-800 text-sm truncate">{item.name}</p>
                    {item.record.status === "REJECTED" && item.record.rejectionReason && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">
                        Reason: {item.record.rejectionReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-slate-50/50 p-3 text-slate-500 border border-dashed border-slate-200">
                    <p className="text-xs">No active application submitted yet.</p>
                  </div>
                )}
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <Button
                size="sm"
                variant={item.record ? "outline" : "default"}
                asChild
                className={`w-full text-xs ${!item.record ? "bg-primary text-white hover:bg-slate-800" : ""}`}
              >
                <Link href={item.href} className="flex items-center justify-center gap-1.5">
                  {item.record ? (
                    item.record.status === "REJECTED" ? "Correct & Resubmit" : "View Details"
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5" /> Apply for Affiliation
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
