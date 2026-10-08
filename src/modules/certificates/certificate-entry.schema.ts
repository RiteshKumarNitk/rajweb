import { z } from "zod";

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();

/** One player's certificate details, as sent by the admin issue/preview screens. */
export const certificateEntrySchema = z.object({
  playerId: z.string().min(1).max(40),
  category: optionalText(80),
  event: optionalText(80),
  achievement: z.string().trim().regex(/^[A-Z_]{3,40}$/).optional(),
  parentName: optionalText(120),
});

/** A template version's editable fields (config is validated by the template service). */
export const templateBodySchema = z.object({
  name: z.string().trim().min(3).max(120),
  description: z.union([z.string().trim().max(500), z.null()]).optional(),
  /** Design layout key (see CERTIFICATE_LAYOUTS); omitted = keep / default. */
  layout: z.string().trim().max(40).optional(),
  config: z.unknown(),
});
