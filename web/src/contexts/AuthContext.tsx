"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LifeTrackerApiClient } from "@/lib/api-client";

export type UserRole = "admin" | "user" | null;

export interface AuthContextType {
  user: User | null;
  session: Session | null;
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

function extractRole(user: User | null): UserRole {
  if (!user) return null;
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role === "admin") return "admin";
  return "user";
}

function extractFullName(user: User | null): string {
  if (!user) return "";
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario"
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [fullName, setFullName] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // Cargar sesión inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      const currentUser = initialSession?.user || null;
      const currentToken = initialSession?.access_token || null;

      setSession(initialSession);
      setUser(currentUser);
      setRole(extractRole(currentUser));
      setFullName(extractFullName(currentUser));
      setToken(currentToken);
      LifeTrackerApiClient.setAuthToken(currentToken);
      setIsLoading(false);
    });

    // Escuchar cambios reactivos de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;
      const currentUser = currentSession?.user || null;
      const currentToken = currentSession?.access_token || null;

      setSession(currentSession);
      setUser(currentUser);
      setRole(extractRole(currentUser));
      setFullName(extractFullName(currentUser));
      setToken(currentToken);
      LifeTrackerApiClient.setAuthToken(currentToken);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const activeUser = data.user;
      const activeSession = data.session;
      const userRole = extractRole(activeUser);
      const activeToken = activeSession?.access_token || null;

      setUser(activeUser);
      setSession(activeSession);
      setRole(userRole);
      setFullName(extractFullName(activeUser));
      setToken(activeToken);
      LifeTrackerApiClient.setAuthToken(activeToken);

      return { error: null, role: userRole };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setRole(null);
      setFullName("");
      setToken(null);
      LifeTrackerApiClient.setAuthToken(null);
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
