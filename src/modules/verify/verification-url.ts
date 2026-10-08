import { siteConfig } from "@/shared/config/site";

/**
 * The single verification payload a certificate QR code encodes — used for the
 * QR printed on the PDF and the QR on the on-screen certificate. Opening it
 * runs the public verification by QR value. Always absolute (a scanned QR
 * cannot resolve a relative link): APP_URL, else the site's canonical URL.
 */
export function certificateVerificationUrl(qrCode: string): string {
  const base = (process.env.APP_URL || siteConfig.url).replace(/\/+$/, "");
  return `${base}/verify?qrCode=${encodeURIComponent(qrCode)}`;
}
