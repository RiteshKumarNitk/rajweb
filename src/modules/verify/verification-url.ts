/**
 * The single verification payload a certificate QR code encodes — used for the
 * QR printed on the PDF and the QR on the on-screen certificate. Opening it
 * runs the public verification by QR value.
 */
export function certificateVerificationUrl(qrCode: string): string {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/verify?qrCode=${encodeURIComponent(qrCode)}`;
}
