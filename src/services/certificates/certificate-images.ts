import path from "node:path";
import fs from "node:fs/promises";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("certificates");

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5000;
const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];

function isPdfKitImage(buf: Buffer): boolean {
  const starts = (sig: number[]) => sig.every((b, i) => buf[i] === b);
  return starts(PNG) || starts(JPEG);
}

/**
 * Loads a logo/signature image for PDF rendering. Accepts a site path under
 * /images/ (read from public/) or an https URL (fetched with a timeout and a
 * size cap). Only PNG/JPEG (what PDFKit can embed). Returns null — and the
 * certificate renders without the image — when anything is off.
 */
export async function loadCertificateImage(ref: string): Promise<Buffer | null> {
  try {
    let buf: Buffer;
    if (ref.startsWith("/images/")) {
      const publicDir = path.resolve(process.cwd(), "public");
      const full = path.resolve(publicDir, "." + ref);
      if (!full.startsWith(publicDir + path.sep)) return null;
      buf = await fs.readFile(full);
    } else if (/^https:\/\//i.test(ref)) {
      // SSRF guard: https only, named public hosts only (no IP literals / localhost).
      const host = new URL(ref).hostname.toLowerCase();
      if (host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) {
        return null;
      }
      const res = await fetch(ref, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "error" });
      if (!res.ok) return null;
      const declared = Number(res.headers.get("content-length") ?? "0");
      if (declared > MAX_BYTES) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }
    if (buf.length === 0 || buf.length > MAX_BYTES || !isPdfKitImage(buf)) return null;
    return buf;
  } catch (err) {
    log.warn({ err, ref }, "Certificate image could not be loaded");
    return null;
  }
}
