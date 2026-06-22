import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { clearSession, readSession, writeSession } from "../api/session";
import { AppShell, AuthUser, BackendRole } from "../api/types";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  shell: AppShell | null;
  login(email: string, password: string, remember: boolean): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function roleToShell(role: BackendRole): AppShell | null {
  if (role === "COLLABORATOR") return "employee";
  if (role === "HR") return "hr";
  if (role === "MANAGER") return "manager";
  if (role === "ADMIN") return "admin";
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const restore = async () => {
    if (!readSession()) {
      setLoading(false);
      return;
    }
    try {
      const current = await api.get<AuthUser>("/auth/me");
      if (!roleToShell(current.role)) throw new Error("unsupported-role");
      setUser(current);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void restore();
    const expired = () => {
      queryClient.clear();
      setUser(null);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      shell: user ? roleToShell(user.role) : null,
      async login(email, password, remember) {
        queryClient.clear();
        const tokens = await api.post<{ accessToken: string; refreshToken: string }>("/auth/login", {
          email,
          password,
        });
        writeSession({ ...tokens, persistent: remember });
        const current = await api.get<AuthUser>("/auth/me");
        if (!roleToShell(current.role)) {
          clearSession();
          throw new Error("Ce rôle n'est pas encore pris en charge par l'interface.");
        }
        setUser(current);
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
    [user, loading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
