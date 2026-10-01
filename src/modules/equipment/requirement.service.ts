import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import type { SessionUser } from "@/security/rbac/permissions";
import { getOrgScope, assertInScope, isInScope } from "@/security/rbac/org-scope";
import { resolveOwnership } from "@/security/rbac/ownership.server";
import { sanitizeText, sanitizeOptionalText } from "@/security/sanitize";
import { EQUIPMENT_CATEGORIES } from "@/modules/equipment/equipment.service";

export const REQUIREMENT_STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "FULFILLED"] as const;
export const REQUIREMENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const fields = {
  itemName: z.string().trim().min(2, "Enter the equipment name").max(160),
  category: z.enum(EQUIPMENT_CATEGORIES),
  description: z.string().trim().max(2000).nullable().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100000),
  estimatedUnitPrice: z.number().int().min(0).max(10000000).nullable().optional(),
  priority: z.enum(REQUIREMENT_PRIORITIES),
  notes: z.string().trim().max(2000).nullable().optional(),
  requiredBy: z.string().date().nullable().optional(),
  attachmentId: z.string().min(1).nullable().optional(),
};

export const createRequirementSchema = z.object({
  ...fields,
  priority: fields.priority.default("MEDIUM"),
  // Ignored for District Admins (always their own district).
  districtId: z.string().min(1).optional(),
});

export const updateRequirementSchema = z
  .object(fields)
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export const reviewRequirementSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "FULFILLED"]),
  reviewNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["FULFILLED"],
  REJECTED: [],
  FULFILLED: [],
};

export function allowedRequirementMoves(status: string): string[] {
  return NEXT_STATUS[status] ?? [];
}

/** Reviewing is for the State Admin (own state) and the Super Admin — not the requesting district. */
export function canReviewRequirements(user: SessionUser): boolean {
  const level = getOrgScope(user).level;
  return level === "STATE" || level === "GLOBAL";
}

function requirementNumber(): string {
  return `REQ-EQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * An attachment must be a requirement upload owned within the caller's scope.
 * Missing, wrong-kind and out-of-scope ids get the same answer, so ids from
 * other districts cannot be probed.
 */
async function checkAttachment(user: SessionUser, attachmentId: string | null | undefined) {
  if (!attachmentId) return;
  const asset = await prisma.mediaAsset.findUnique({ where: { id: attachmentId }, select: { kind: true, stateId: true, districtId: true } });
  if (!asset || asset.kind !== "REQUIREMENT_ATTACHMENT" || !isInScope(getOrgScope(user), { stateId: asset.stateId, districtId: asset.districtId })) {
    throw AppError.validation("Invalid attachment");
  }
}

export async function createRequirement(user: SessionUser, input: z.infer<typeof createRequirementSchema>) {
  const owner = await resolveOwnership(user, { districtId: input.districtId ?? null }, { allowCentral: false });
  if (!owner.districtId || !owner.stateId) throw AppError.validation("Select the district this requirement is for");
  await checkAttachment(user, input.attachmentId);

  return prisma.equipmentRequirement.create({
    data: {
      requirementNumber: requirementNumber(),
      stateId: owner.stateId,
      districtId: owner.districtId,
      requestedById: user.id,
      itemName: sanitizeText(input.itemName),
      category: input.category,
      description: sanitizeOptionalText(input.description) ?? null,
      quantity: input.quantity,
      estimatedUnitPrice: input.estimatedUnitPrice ?? null,
      priority: input.priority,
      notes: sanitizeOptionalText(input.notes) ?? null,
      requiredBy: input.requiredBy ? new Date(`${input.requiredBy}T00:00:00.000Z`) : null,
      attachmentId: input.attachmentId ?? null,
    },
  });
}

/** Loads a requirement inside the caller's scope (404 otherwise). */
export async function loadScopedRequirement(user: SessionUser, id: string) {
  const requirement = await prisma.equipmentRequirement.findUnique({ where: { id } });
  if (!requirement) throw AppError.notFound("Requirement not found");
  assertInScope(user, { stateId: requirement.stateId, districtId: requirement.districtId }, "Requirement not found");
  return requirement;
}

export async function updateRequirement(user: SessionUser, id: string, input: z.infer<typeof updateRequirementSchema>) {
  const existing = await loadScopedRequirement(user, id);
  if (existing.status !== "PENDING") throw AppError.conflict("Only pending requirements can be edited.");
  await checkAttachment(user, input.attachmentId);
  return prisma.equipmentRequirement.update({
    where: { id },
    data: {
      ...(input.itemName !== undefined ? { itemName: sanitizeText(input.itemName) } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.description !== undefined ? { description: sanitizeOptionalText(input.description) ?? null } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.estimatedUnitPrice !== undefined ? { estimatedUnitPrice: input.estimatedUnitPrice ?? null } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.notes !== undefined ? { notes: sanitizeOptionalText(input.notes) ?? null } : {}),
      ...(input.requiredBy !== undefined ? { requiredBy: input.requiredBy ? new Date(`${input.requiredBy}T00:00:00.000Z`) : null } : {}),
      ...(input.attachmentId !== undefined ? { attachmentId: input.attachmentId ?? null } : {}),
    },
  });
}

export async function reviewRequirement(user: SessionUser, id: string, input: z.infer<typeof reviewRequirementSchema>) {
  if (!canReviewRequirements(user)) throw AppError.forbidden("Only the State Admin or Super Admin can review requirements");
  const existing = await loadScopedRequirement(user, id);
  if (!allowedRequirementMoves(existing.status).includes(input.status)) {
    throw AppError.conflict(`A ${existing.status.replace("_", " ").toLowerCase()} requirement cannot move to ${input.status.replace("_", " ").toLowerCase()}.`);
  }
  if (input.status === "REJECTED" && !input.reviewNote) throw AppError.validation("Give a reason for rejecting");
  const updated = await prisma.equipmentRequirement.updateMany({
    where: { id, status: existing.status },
    data: { status: input.status, reviewNote: input.reviewNote ? sanitizeText(input.reviewNote) : existing.reviewNote, reviewedById: user.id, reviewedAt: new Date() },
  });
  if (updated.count === 0) throw AppError.conflict("This requirement was changed by someone else. Reload and try again.");
  return { ...existing, status: input.status };
}

export async function deleteRequirement(user: SessionUser, id: string) {
  const existing = await loadScopedRequirement(user, id);
  if (existing.status !== "PENDING") throw AppError.conflict("Only pending requirements can be deleted.");
  await prisma.equipmentRequirement.delete({ where: { id } });
  return existing;
}
