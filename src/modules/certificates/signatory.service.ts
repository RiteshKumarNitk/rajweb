import { z } from "zod";

const imageRef = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v.startsWith("/images/") || /^\/api\/media\/[a-z0-9]{10,40}$/i.test(v) || /^https:\/\//i.test(v),
    "Signature image must be an uploaded image, a /images/... path or an https URL"
  );

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v));

export const signatoryInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  designation: z.string().trim().min(2).max(100),
  organization: optionalText(150),
  signatureImageUrl: z.union([imageRef, z.literal(""), z.null()]).optional().transform((v) => (v === "" ? null : v)),
  stateId: z.string().min(1).nullable().optional(),
  districtId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100000).optional(),
});

export const signatoryUpdateSchema = signatoryInputSchema
  .partial()
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: "No changes provided" });

/**
 * Signatories a tournament may use: federation-level, its own state's
 * state-level officials, and its own district's officials — never another
 * district's or another state's.
 */
export function applicableSignatoryWhere(tournament: { stateId: string | null; districtId: string | null }) {
  return {
    isActive: true,
    OR: [
      { stateId: null, districtId: null },
      ...(tournament.stateId ? [{ stateId: tournament.stateId, districtId: null }] : []),
      ...(tournament.districtId ? [{ districtId: tournament.districtId }] : []),
    ],
  };
}
