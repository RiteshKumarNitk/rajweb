import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { slugify } from "@/lib/utils";

export const EQUIPMENT_CATEGORIES = [
  "RACQUETS",
  "BALLS",
  "GRIPS",
  "BAGS",
  "ACCESSORIES",
  "TRAINING",
  "OTHER",
] as const;

const imageRefSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v.startsWith("/images/") || /^https?:\/\//i.test(v),
    "Image must be a /images/... site path or an http(s) URL"
  );

export const equipmentSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).nullable().optional(),
  shortDescription: z.string().trim().max(300).nullable().optional(),
  image: imageRefSchema.nullable().optional(),
  category: z.enum(EQUIPMENT_CATEGORIES).default("OTHER"),
  // Whole rupees, integer money — no floats.
  price: z.number().int().min(0).max(10000000),
  stockQuantity: z.number().int().min(0).max(1000000).default(0),
  sortOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
});

export const equipmentUpdateSchema = equipmentSchema.partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

export type EquipmentInput = z.infer<typeof equipmentSchema>;
export type EquipmentUpdate = z.infer<typeof equipmentUpdateSchema>;

async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base) || "equipment";
  let candidate = slug;
  let counter = 1;
  while (await prisma.equipmentItem.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${counter++}`;
  }
  return candidate;
}

export async function createEquipmentItem(input: EquipmentInput) {
  const slug = await uniqueSlug(input.name);
  return prisma.equipmentItem.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      shortDescription: input.shortDescription ?? null,
      image: input.image ?? null,
      category: input.category,
      price: input.price,
      stockQuantity: input.stockQuantity,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
}

export async function updateEquipmentItem(id: string, input: EquipmentUpdate) {
  const data: Record<string, unknown> = {};
  for (const key of [
    "name",
    "description",
    "shortDescription",
    "image",
    "category",
    "price",
    "stockQuantity",
    "sortOrder",
    "isActive",
  ] as const) {
    if (input[key] !== undefined) data[key] = input[key] ?? null;
  }
  // name changes don't change the slug — existing order snapshots keep their
  // own name copy and the slug is only a stable admin/public identifier.
  return prisma.equipmentItem.update({ where: { id }, data });
}

/**
 * Delete safety: an item referenced by any purchase order is archived
 * (deactivated) instead of destroyed, so historical orders stay valid forever.
 * Returns how it was disposed of.
 */
export async function deleteOrArchiveEquipmentItem(id: string): Promise<"deleted" | "archived"> {
  const item = await prisma.equipmentItem.findUnique({
    where: { id },
    include: { _count: { select: { purchaseItems: true } } },
  });
  if (!item) return "deleted"; // caller 404s beforehand; defensive

  if (item._count.purchaseItems > 0) {
    await prisma.equipmentItem.update({ where: { id }, data: { isActive: false } });
    return "archived";
  }
  await prisma.equipmentItem.delete({ where: { id } });
  return "deleted";
}
