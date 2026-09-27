import type PDFKit from "pdfkit";

/**
 * PDFKit must run un-bundled on the server (next.config.ts →
 * serverExternalPackages: ["pdfkit"]) so it can load its built-in font
 * metrics from node_modules/pdfkit/js/data. With that in place the 14
 * standard PDF fonts work by name.
 *
 * Do not pass an .afm file *path* to doc.font(): PDFKit treats paths as
 * embeddable font files and fontkit rejects AFM ("Unknown font format").
 */
export async function createPdfDocument(options?: PDFKit.PDFDocumentOptions) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument(options);
  doc.font("Helvetica");
  return doc;
}
