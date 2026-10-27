export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

let csrf = "";

async function ensureCsrf() {
  if (csrf) return;
  const response = await fetch(`${API}/auth/csrf`, { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (data?.csrfToken) csrf = data.csrfToken;
}

export function rememberCsrf(token: string) {
  if (token) csrf = token;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") await ensureCsrf();
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (csrf && method !== "GET" && method !== "HEAD") headers.set("X-CSRF-Token", csrf);
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && path !== "/admin/login") {
    window.location.href = "/";
    throw new Error("انتهت الجلسة");
  }
  const data = await response.json().catch(() => ({}));
  if (data?.csrfToken) csrf = data.csrfToken;
  if (!response.ok) {
    const message = data?.error?.message || data?.message || "تعذر تنفيذ الطلب";
    throw new Error(message);
  }
  return data as T;
}
