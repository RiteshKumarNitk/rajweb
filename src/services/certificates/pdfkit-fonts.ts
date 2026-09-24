import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import type PDFKit from "pdfkit";

let cachedDataDir: string | null = null;

export function getPdfKitDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  const candidates: string[] = [
    path.join(process.cwd(), "node_modules", "pdfkit", "js", "data"),
  ];

  try {
    const require = createRequire(import.meta.url);
    const pdfkitRoot = path.dirname(require.resolve("pdfkit/package.json"));
    candidates.unshift(path.join(pdfkitRoot, "js", "data"));
  } catch {
    // Bundled runtime may not resolve pdfkit — fall back to cwd
  }

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "Helvetica.afm"))) {
      cachedDataDir = dir;
      return dir;
    }
  }

  throw new Error("PDFKit font files not found. Run npm install.");
}

export function getPdfKitFont(fontFile: string): string {
  return path.join(getPdfKitDataDir(), fontFile);
}

export async function createPdfDocument(options?: PDFKit.PDFDocumentOptions) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument(options);
  doc.font(getPdfKitFont("Helvetica.afm"));
  return doc;
}
