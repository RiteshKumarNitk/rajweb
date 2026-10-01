export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Client IP for rate limiting. Vercel (production) overwrites X-Forwarded-For
 * with the real client IP. Netlify's own header is trusted only on Netlify —
 * anywhere else a client could simply send it. Behind any other proxy, the
 * proxy must overwrite X-Forwarded-For.
 */
export function getClientIp(headers: Headers): string {
  return (
    (process.env.NETLIFY === "true" ? headers.get("x-nf-client-connection-ip") : null) ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
