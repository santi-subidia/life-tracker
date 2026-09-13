"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { LifeTrackerApiClient } from "@/lib/api-client";

export type UserRole = "admin" | "user" | null;

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  user_metadata?: {
    full_name?: string;
    role?: string;
  };
  app_metadata?: {
    role?: string;
  };
}

export interface AuthSession {
  access_token: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  role: UserRole;
  fullName: string;
  token: string | null;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; role: UserRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function setCookie(name: string, value: string | null | undefined, days = 7) {
  if (typeof document === "undefined" || value === null || value === undefined) return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax${secureFlag}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureFlag}`;
}

function buildAuthUser(id: string, email: string, fullName: string, role: UserRole): AuthUser {
  return {
    id,
    email,
    fullName: fullName || email.split("@")[0] || "Usuario",
    role,
    user_metadata: {
      full_name: fullName,
      role: role || "user",
    },
    app_metadata: {
      role: role || "user",
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [fullName, setFullName] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // Recuperar token y usuario desde cookies o localStorage
    const savedToken = getCookie("soma_token") || (typeof window !== "undefined" ? localStorage.getItem("soma_token") : null);
    const savedUserJson = getCookie("soma_user") || (typeof window !== "undefined" ? localStorage.getItem("soma_user") : null);

    if (savedToken) {
      LifeTrackerApiClient.setAuthToken(savedToken);
      setToken(savedToken);
      setSession({ access_token: savedToken });

      if (savedUserJson) {
        try {
          const parsed = JSON.parse(savedUserJson);
          const parsedRole = (parsed.role?.toLowerCase() === "admin" ? "admin" : "user") as UserRole;
          const authUser = buildAuthUser(parsed.id || parsed.userId, parsed.email, parsed.fullName, parsedRole);
          setUser(authUser);
          setRole(parsedRole);
          setFullName(authUser.fullName);
        } catch {
          // Continuar con validación remota
        }
      }

      // Validar sesión contra el backend (.NET Identity /api/auth/me)
      LifeTrackerApiClient.getMe(savedToken)
        .then((info) => {
          if (!mounted) return;
          const validRole = (info.role?.toLowerCase() === "admin" ? "admin" : "user") as UserRole;
          const verifiedUser = buildAuthUser(info.userId, info.email, info.fullName, validRole);
          setUser(verifiedUser);
          setRole(validRole);
          setFullName(verifiedUser.fullName);

          // Sincronizar cookies y almacenamiento
          setCookie("soma_token", savedToken);
          setCookie("soma_role", validRole);
          setCookie("soma_user", JSON.stringify(verifiedUser));
          if (typeof window !== "undefined") {
            localStorage.setItem("soma_token", savedToken);
            localStorage.setItem("soma_user", JSON.stringify(verifiedUser));
          }
        })
        .catch((err) => {
          console.warn("[Auth] Token expirado o inválido:", err);
          if (!mounted) return;
          deleteCookie("soma_token");
          deleteCookie("soma_role");
          deleteCookie("soma_user");
          if (typeof window !== "undefined") {
            localStorage.removeItem("soma_token");
            localStorage.removeItem("soma_user");
          }
          LifeTrackerApiClient.setAuthToken(null);
          setUser(null);
          setSession(null);
          setRole(null);
          setFullName("");
          setToken(null);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await LifeTrackerApiClient.login(email, password);

      const userRole = (response.role?.toLowerCase() === "admin" ? "admin" : "user") as UserRole;
      const activeUser = buildAuthUser(
        response.userId,
        response.email,
        response.fullName,
        userRole
      );
      const activeSession = { access_token: response.token };

      // Guardar en cookies para middleware
      setCookie("soma_token", response.token);
      setCookie("soma_role", userRole);
      setCookie("soma_user", JSON.stringify(activeUser));

      // Guardar en localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("soma_token", response.token);
        localStorage.setItem("soma_user", JSON.stringify(activeUser));
      }

      // Actualizar estado en memoria
      setUser(activeUser);
      setSession(activeSession);
      setRole(userRole);
      setFullName(activeUser.fullName);
      setToken(response.token);
      LifeTrackerApiClient.setAuthToken(response.token);

      return { error: null, role: userRole };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { error, role: null };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      deleteCookie("soma_token");
      deleteCookie("soma_role");
      deleteCookie("soma_user");
      if (typeof window !== "undefined") {
        localStorage.removeItem("soma_token");
        localStorage.removeItem("soma_user");
      }

      LifeTrackerApiClient.setAuthToken(null);
      setUser(null);
      setSession(null);
      setRole(null);
      setFullName("");
      setToken(null);

      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      session,
      role,
      fullName,
      token,
      isLoading,
      signIn,
      signOut,
    }),
    [user, session, role, fullName, token, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un <AuthProvider />");
  }
  return context;
}
