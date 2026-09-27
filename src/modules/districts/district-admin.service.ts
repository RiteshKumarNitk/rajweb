import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { slugify } from "@/lib/utils";
import type { SessionUser } from "@/security/rbac/permissions";
import { getOrgScope } from "@/security/rbac/org-scope";

const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.literal(""), z.null()])
    .optional()
    // "" clears the field; stored as typed (React escapes on render).
    .transform((v) => (v === "" ? null : typeof v === "string" ? v.trim() : v));

const contactFields = {
  president: optionalText(100),
  secretary: optionalText(100),
  email: z
    .union([z.string().email().max(254), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v?.trim().toLowerCase() ?? v)),
  phone: z
    .union([z.string().min(6).max(20), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  address: optionalText(300),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
};

export const createDistrictSchema = z.object({
  name: z.string().trim().min(2).max(100),
  stateId: z.string().min(1).optional(),
  ...contactFields,
});

export const updateDistrictSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    stateId: z.string().min(1).optional(),
    ...contactFields,
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), { message: "No changes provided" });

/**
 * State a new/moved district may belong to. Only GLOBAL users choose freely;
 * a state admin's districts always stay in their own state; district-scoped
 * users cannot create or re-home districts at all.
 */
export async function resolveDistrictState(user: SessionUser, requestedStateId: string | undefined): Promise<string> {
  const scope = getOrgScope(user);
  if (scope.level === "STATE") {
    if (requestedStateId && requestedStateId !== scope.stateId) throw AppError.validation("Invalid state selected");
    return scope.stateId;
  }
  if (scope.level !== "GLOBAL") {
    throw AppError.forbidden("Only state or federation administrators can add or move districts");
  }
  if (!requestedStateId) throw AppError.validation("Select the state this district belongs to");
  const state = await prisma.state.findUnique({ where: { id: requestedStateId }, select: { id: true } });
  if (!state) throw AppError.validation("Invalid state selected");
  return state.id;
}

/** Unique within the state (the DB enforces @@unique([stateId, name]) and [stateId, slug]). */
export async function assertDistrictNameAvailable(stateId: string, name: string, excludeId?: string) {
  const clash = await prisma.district.findFirst({
    where: {
      stateId,
      OR: [{ name: { equals: name, mode: "insensitive" } }, { slug: slugify(name) }],
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw AppError.conflict(`A district named "${name}" already exists in this state`);
}

export { slugify as districtSlug };
