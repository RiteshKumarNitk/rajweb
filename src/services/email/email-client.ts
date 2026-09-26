import { Resend } from "resend";

let client: Resend | null = null;

export function getClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email is not configured: set RESEND_API_KEY (see Resend dashboard → API Keys)."
    );
  }
  if (!client) {
    client = new Resend(apiKey);
  }
  return client;
}
