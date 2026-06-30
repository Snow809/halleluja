import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { clearSession, readSession, writeSession } from "@/api/session";
import type { AppShell, AuthUser, BackendRole, MfaChallenge } from "@/api/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  shell: AppShell | null;
  login(email: string, password: string, remember: boolean): Promise<MfaChallenge>;
  verifyMfa(input: { mfaToken: string; code: string; remember: boolean }): Promise<AuthUser>;
  refreshUser(): Promise<AuthUser>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_RESTORE_TIMEOUT_MS = 4_000;

export function roleToShell(role: BackendRole): AppShell | null {
  if (role === "COLLABORATOR") return "employee";
  if (role === "HR") return "hr";
  if (role === "MANAGER") return "manager";
  if (role === "ADMIN") return "admin";
  if (role === "QVT") return "qvt";
  return null;
}

export function mobileHomeForShell(shell: AppShell | null) {
  if (shell === "employee") return "/employee/home";
  if (shell === "manager") return "/manager/home";
  if (shell === "hr" || shell === "admin" || shell === "qvt") return "/desktop-required";
  return "/login";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        if (!readSession()) {
          setLoading(false);
          return;
        }
        const current = await withAuthRestoreTimeout(api.get<AuthUser>("/auth/me"));
        setUser(current);
      } catch {
        clearSession();
        setUser(null);
        if (!["/login", "/mfa", "/consent"].includes(window.location.pathname)) window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    void restore();
    const expired = () => {
      clearSession();
      queryClient.clear();
      setUser(null);
      setLoading(false);
      if (!["/login", "/mfa", "/consent"].includes(window.location.pathname)) window.location.assign("/login");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      shell: user ? roleToShell(user.role) : null,
      async login(email, password) {
        clearSession();
        queryClient.clear();
        return api.post<MfaChallenge>("/auth/login", { email, password });
      },
      async verifyMfa({ mfaToken, code, remember }) {
        queryClient.clear();
        const tokens = await api.post<{ accessToken: string; refreshToken: string }>("/auth/mfa/verify", { mfaToken, code, remember });
        writeSession({ ...tokens, persistent: remember });
        const current = await api.get<AuthUser>("/auth/me");
        setUser(current);
        return current;
      },
      async refreshUser() {
        const current = await api.get<AuthUser>("/auth/me");
        setUser(current);
        return current;
      },
      async logout() {
        const session = readSession();
        try {
          if (session) await api.post("/auth/logout", { refreshToken: session.refreshToken });
        } finally {
          clearSession();
          queryClient.clear();
          setUser(null);
        }
      },
    }),
    [queryClient, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

function withAuthRestoreTimeout<T>(promise: Promise<T>) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("auth-restore-timeout")), AUTH_RESTORE_TIMEOUT_MS)),
  ]);
}
