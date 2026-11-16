import { getAccessToken, clearAuth } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  // All responses use { status, data } or { status, error } envelope
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = json?.error;
    const message =
      typeof err === "string" ? err : err?.message ?? json?.message ?? res.statusText;
    throw new Error(message || `Request failed (${res.status})`);
  }

  // Unwrap envelope: { status: "success", data: ... }
  return (json?.data ?? json) as T;
}

/** Upload a file to POST /admin/upload and return the served URL. */
export async function uploadImage(file: File): Promise<string> {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/admin/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Upload failed");

  const data = json?.data ?? json;
  return data.url as string;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
