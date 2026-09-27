import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { slugify } from "@/lib/utils";
import type { SessionUser } from "@/security/rbac/permissions";
import { getOrgScope } from "@/security/rbac/org-scope";

export const stateInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .union([z.string().trim().min(1).max(10), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v.toUpperCase() : v === undefined ? undefined : null)),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const stateUpdateSchema = stateInputSchema
  .partial()
  .refine((data) => Object.values(data).some((v) => v !== undefined), { message: "No changes provided" });

/** Creating, editing and deleting states is federation-level work: GLOBAL scope only. */
export function assertCanManageStates(user: SessionUser) {
  if (getOrgScope(user).level !== "GLOBAL") {
    throw AppError.forbidden("Only the Super Admin can manage states");
  }
}

export async function assertStateUnique(name: string, code: string | null | undefined, excludeId?: string) {
  const exclude = excludeId ? { NOT: { id: excludeId } } : {};
  const [byName, byCode] = await Promise.all([
    prisma.state.findFirst({
      where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug: slugify(name) }], ...exclude },
      select: { id: true },
    }),
    code ? prisma.state.findFirst({ where: { code, ...exclude }, select: { id: true } }) : null,
  ]);
  if (byName) throw AppError.conflict(`A state named "${name}" already exists`);
  if (byCode) throw AppError.conflict(`State code "${code}" is already in use`);
}

export { slugify as stateSlug };
