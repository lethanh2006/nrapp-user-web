"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { SessionUser } from "@/lib/auth/session-user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

type AuthSessionContextValue = {
  user: SessionUser | null;
  status: AuthStatus;
  error: string;
  refreshSession: () => Promise<SessionUser | null>;
  setAuthenticatedUser: (user: SessionUser) => void;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState("");
  const bootstrapped = useRef(false);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const result = await apiRequest<{ user: SessionUser }>("/api/auth/session");
      setUser(result.user);
      setStatus("authenticated");
      return result.user;
    } catch (requestError) {
      if (requestError instanceof ApiClientError && [401, 403].includes(requestError.status)) {
        setUser(null);
        setStatus("unauthenticated");
        return null;
      }
      setUser(null);
      setError(requestError instanceof Error ? requestError.message : "Không thể kiểm tra phiên đăng nhập.");
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    void refreshSession();
  }, [refreshSession]);

  const setAuthenticatedUser = useCallback((nextUser: SessionUser) => {
    setUser(nextUser);
    setError("");
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<{ message: string }>("/api/auth/logout", { method: "POST" });
    } catch {
      // The local session must still be cleared when the network goes away.
    } finally {
      setUser(null);
      setError("");
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthSessionContext.Provider value={{ user, status, error, refreshSession, setAuthenticatedUser, logout }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error("useAuthSession phải được dùng bên trong AuthSessionProvider.");
  return context;
}
