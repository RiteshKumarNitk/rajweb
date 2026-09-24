export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string; details?: unknown };
  meta?: { requestId?: string; timestamp?: string };
}

export async function handleApiFetch<T>(res: Response): Promise<{ data: T; message?: string }> {
  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? "Request failed");
  }

  return { data: json.data as T, message: json.message };
}

let csrfTokenPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf", { credentials: "same-origin" });
  const json = (await res.json()) as ApiResponse<{ token: string }>;
  if (!res.ok || !json.success || !json.data?.token) {
    throw new Error("Failed to obtain CSRF token");
  }
  return json.data.token;
}

export async function getCsrfToken(): Promise<string> {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken();
  }
  return csrfTokenPromise;
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("x-csrf-token", await getCsrfToken());
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers, credentials: "same-origin" });
}

export async function apiPost<TBody>(url: string, body: TBody): Promise<Response> {
  return apiFetch(url, { method: "POST", body: JSON.stringify(body) });
}
