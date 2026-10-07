import type { ApiEnvelope, ApiError } from "@/lib/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<ApiEnvelope<T>> & Partial<ApiError> & { message?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? payload?.message ?? `Request failed (${response.status})`);
  }

  return (payload?.data ?? payload) as T;
}
