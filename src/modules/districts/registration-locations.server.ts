import { unstable_cache } from "next/cache";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import type { RegistrationLocation } from "@/modules/districts/registration-locations";

async function loadRegistrationLocations(): Promise<RegistrationLocation[]> {
  const states = await prisma.state.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      districts: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      },
    },
  });
  return states.filter((s) => s.districts.length > 0).map((s) => ({ ...s, districts: s.districts.map((d) => d.name) }));
}

/** Active states with their active districts, for form pickers. Shares the districts cache tag. */
export const getRegistrationLocations = unstable_cache(loadRegistrationLocations, ["registration-locations"], {
  revalidate: 60,
  tags: ["public-districts"],
});

/**
 * Resolves the district a registration/membership/request belongs to — and
 * therefore its owning state — from user input, server-side.
 *
 * `state` (slug or id) pins the lookup to that state. Without it the name
 * must be unambiguous across states; when two states share a district name
 * the caller must say which state (400), so a record is never silently
 * attached to the wrong state. Districts with no state are not selectable.
 *
 * `withinStateId` (server-supplied, never from the client) restricts the
 * result to one state — used for moves that must not cross states.
 */
export async function resolveRegistrationDistrict(input: {
  district: string;
  state?: string | null;
  withinStateId?: string | null;
}): Promise<{ districtId: string; stateId: string }> {
  const name = input.district.trim();
  const stateRef = input.state?.trim();

  const matches = await prisma.district.findMany({
    where: {
      name: { equals: name, mode: "insensitive" },
      stateId: input.withinStateId ?? { not: null },
      ...(stateRef ? { state: { OR: [{ slug: stateRef }, { id: stateRef }], isActive: true } } : {}),
    },
    select: { id: true, stateId: true },
    take: 2,
  });

  if (matches.length === 0) throw AppError.validation("Invalid district selected");
  if (matches.length > 1) throw AppError.validation("Select your state — this district name exists in more than one state");
  return { districtId: matches[0].id, stateId: matches[0].stateId! };
}
