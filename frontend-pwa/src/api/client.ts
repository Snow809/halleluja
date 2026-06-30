import { ApiEnvelope } from "./types";
import { clearSession, readSession, writeSession } from "./session";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
const REQUEST_TIMEOUT_MS = 15_000;

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
    refreshPromise = fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
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

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = readSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && session?.refreshToken) {
    await refreshAccessToken();
    return apiRequest<T>(path, init, false);
  }
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && session) {
    clearSession();
    window.dispatchEvent(new Event("session-expired"));
  }
  if (!response.ok) throw new ApiError(errorMessage(payload), response.status, payload);
  return (payload as ApiEnvelope<T>).data;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PATCH", body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) }),
  streamChat: (body: { question: string; conversationId?: string }, onEvent: (event: { type: string; data: any }) => void) =>
    streamChat(body, onEvent),
};

async function streamChat(body: { question: string; conversationId?: string }, onEvent: (event: { type: string; data: any }) => void, retry = true) {
  const session = readSession();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
  const response = await fetchWithTimeout(`${API_BASE_URL}/chat/ask/stream`, { method: "POST", headers, body: JSON.stringify(body) });
  if (response.status === 401 && retry && session?.refreshToken) {
    await refreshAccessToken();
    return streamChat(body, onEvent, false);
  }
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    throw new ApiError(errorMessage(payload), response.status, payload);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const event = parseSse(part);
      if (event) onEvent(event);
    }
  }
  const finalEvent = parseSse(buffer);
  if (finalEvent) onEvent(finalEvent);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new ApiError("Le serveur ne répond pas.", 408);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function parseSse(part: string) {
  const lines = part.split(/\r?\n/);
  const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
  if (!event) return null;
  return { type: event, data: data ? JSON.parse(data) : null };
}
