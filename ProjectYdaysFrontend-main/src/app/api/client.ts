import { ApiEnvelope } from "./types";
import { clearSession, readSession, writeSession } from "./session";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<string> | null = null;

function errorMessage(payload: any) {
  const error = payload?.error;
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (Array.isArray(error?.message)) return error.message.join(", ");
  return "Une erreur est survenue.";
}

async function refreshAccessToken() {
  const session = readSession();
  if (!session?.refreshToken) throw new ApiError("Session expirée", 401);
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new ApiError(errorMessage(payload), response.status, payload);
        const tokens = (payload as ApiEnvelope<{ accessToken: string; refreshToken: string }>).data;
        writeSession({ ...tokens, persistent: session.persistent });
        return tokens.accessToken;
      })
      .catch((error) => {
        clearSession();
        window.dispatchEvent(new Event("session-expired"));
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && session?.refreshToken) {
    await refreshAccessToken();
    return apiRequest<T>(path, init, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(errorMessage(payload), response.status, payload);
  return (payload as ApiEnvelope<T>).data;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
