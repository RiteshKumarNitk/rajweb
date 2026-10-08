import path from "node:path";
import fs from "node:fs";

/**
 * Embedded fonts for template certificates (SIL Open Font License — see the
 * OFL-*.txt files next to them). Open Sans Bold stands in for the reference
 * design's humanist sans; Pacifico for its brush-script "Certificate"
 * heading. Times-BoldItalic (recipient lines) is a built-in PDF font.
 *
 * Read from disk once per process; next.config.ts → outputFileTracingIncludes
 * ships the folder with the server routes that render certificates.
 */
const FONT_DIR = path.join(process.cwd(), "src", "services", "certificates", "fonts");

export const CERTIFICATE_FONTS = {
  sansBold: { name: "OpenSans-Bold", file: "OpenSans-Bold.ttf" },
  script: { name: "Pacifico", file: "Pacifico-Regular.ttf" },
} as const;

let cache: Map<string, Buffer> | null = null;

export function loadCertificateFonts(): Map<string, Buffer> {
  if (!cache) {
    const loaded = new Map<string, Buffer>();
    for (const f of Object.values(CERTIFICATE_FONTS)) loaded.set(f.name, fs.readFileSync(path.join(FONT_DIR, f.file)));
    cache = loaded;
  }
  return cache;
}
