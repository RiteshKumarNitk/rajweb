import prisma from "@/infrastructure/database/prisma";
import type { MembershipTypeKey, MembershipPricing } from "@/modules/account/membership-pricing";

/**
 * Centralized in the existing Setting table (key/value, group "membership")
 * rather than hardcoded per component — the same table already had
 * (unused) single-value membership_fee_* rows; this splits each into an
 * explicit new-vs-renewal pair. A Super Admin pricing-edit UI is the natural
 * next step (see the phase report) but /admin/settings is read-only today,
 * so this phase only wires reading these values, not editing them.
 *
 * Server-only, deliberately kept out of membership-pricing.ts: that file is
 * imported by client "Apply for X" components for the pure formatInr()
 * helper and types, and pulling Prisma into that import graph breaks the
 * client bundle (same lesson as role-permissions.server.ts).
 */
const SETTING_KEYS: Record<MembershipTypeKey, { new: string; renewal: string }> = {
  club: { new: "membership_fee_club_new", renewal: "membership_fee_club_renewal" },
  school: { new: "membership_fee_school_new", renewal: "membership_fee_school_renewal" },
  academy: { new: "membership_fee_academy_new", renewal: "membership_fee_academy_renewal" },
};

export async function getMembershipPricing(): Promise<Record<MembershipTypeKey, MembershipPricing>> {
  const allKeys = Object.values(SETTING_KEYS).flatMap((k) => [k.new, k.renewal]);
  const rows = await prisma.setting.findMany({ where: { key: { in: allKeys } } });
  const values = new Map(rows.map((r) => [r.key, Number(r.value)]));

  const result = {} as Record<MembershipTypeKey, MembershipPricing>;
  for (const type of Object.keys(SETTING_KEYS) as MembershipTypeKey[]) {
    result[type] = {
      new: values.get(SETTING_KEYS[type].new) ?? 0,
      renewal: values.get(SETTING_KEYS[type].renewal) ?? 0,
    };
  }
  return result;
}
