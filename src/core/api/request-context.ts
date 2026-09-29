export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Client IP for rate limiting. The platform-set header comes first: the
 * left-most X-Forwarded-For entry can be supplied by the client itself when
 * the proxy appends rather than overwrites it.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-nf-client-connection-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
