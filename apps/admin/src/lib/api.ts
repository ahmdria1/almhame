export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4710/api";

export function adminToken(): string {
  return sessionStorage.getItem("elw_admin") || "";
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${adminToken()}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, { ...init, headers });
  if (response.status === 401) {
    sessionStorage.removeItem("elw_admin");
    window.location.href = "/";
    throw new Error("انتهت الجلسة");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || "تعذر تنفيذ الطلب";
    throw new Error(message);
  }
  return data as T;
}
