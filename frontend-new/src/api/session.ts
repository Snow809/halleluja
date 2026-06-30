const SESSION_KEY = "intelli-talent-session-v1";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  persistent: boolean;
}

let cached: StoredSession | null | undefined;

export function readSession(): StoredSession | null {
  if (cached !== undefined) return cached;
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
  if (!raw) return (cached = null);
  try {
    return (cached = JSON.parse(raw) as StoredSession);
  } catch {
    clearSession();
    return null;
  }
}

export function writeSession(session: StoredSession) {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  const storage = session.persistent ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  cached = session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  cached = null;
}

