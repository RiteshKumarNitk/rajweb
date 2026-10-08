import { AppError } from "@/core/errors/app-error";
import type { CertificateSnapshot } from "./certificate-snapshot";
import { renderRraStandardV1 } from "./rra-standard-v1";
import { renderRraStandardV2 } from "./rra-standard-v2";

/**
 * Structured input of the PDF generator. Everything printed is in the
 * snapshot (template version + config, certificate number, issue date,
 * tournament, player, category, event, position, signatories, verification
 * URL); images arrive already loaded. The generator never touches the
 * database — data retrieval lives in tournament-certificates.service.ts.
 */
export interface GenerateCertificateInput {
  snapshot: CertificateSnapshot;
  /** Asset id → image bytes (PNG/JPEG); a missing entry is simply not drawn. */
  images: Record<string, Buffer | null>;
  /** Signature images in signing order (null = typed signature only). */
  signatureImages: (Buffer | null)[];
  /** Set only for admin previews: stamps the page so it cannot pass as issued. */
  previewLabel?: string;
}

type LayoutRenderer = (input: GenerateCertificateInput) => Promise<Buffer>;

/**
 * Renderer per layout version. A design change is a NEW key (e.g.
 * "rra-standard@2") with its own renderer; existing keys are never altered,
 * because certificates issued with them must keep rendering identically.
 */
export const CERTIFICATE_LAYOUTS: Record<string, { label: string; render: LayoutRenderer }> = {
  "rra-standard@1": { label: "RRA Standard, framed with drawn logos (layout v1)", render: renderRraStandardV1 },
  "rra-standard@2": { label: "RRA Standard on A4 background artwork (layout v2)", render: renderRraStandardV2 },
};

export const DEFAULT_LAYOUT = "rra-standard@2";

export async function generateCertificate(input: GenerateCertificateInput): Promise<Buffer> {
  const layout = CERTIFICATE_LAYOUTS[input.snapshot.template.layout];
  if (!layout) throw AppError.internal(`Unknown certificate layout "${input.snapshot.template.layout}"`);
  return layout.render(input);
}
