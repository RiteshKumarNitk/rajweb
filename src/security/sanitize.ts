const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char)
    .slice(0, 10000);
}

export function sanitizeOptionalText(input?: string | null): string | undefined {
  if (!input) return undefined;
  return sanitizeText(input);
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+\-\s()]/g, "").trim().slice(0, 20);
}
