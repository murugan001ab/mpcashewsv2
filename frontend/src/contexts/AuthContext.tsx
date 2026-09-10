"use client";
// src/contexts/AuthContext.tsx
//
// NOTE on the old frontend's bug: there were duplicate AuthContext.jsx /
// AuthContext.tsx files. Vite resolved the bare ".jsx" version first, which
// shadowed this fuller ".tsx" implementation and was missing `accessToken`
// from its context value entirely — so any component destructuring
// `accessToken` got `undefined`. There is only ONE AuthContext file in this
// Next.js app (this one), so that whole class of bug can't recur here.
//
// Auth is cookie-based (HttpOnly access_token cookie) — accessToken below is
// kept only as an in-memory convenience value for code that wants a quick
// "do we look logged in" string; it is never read from or written to storage.
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/services/api";
import type { User } from "@/types";

export interface AuthContextType {
  isLogged: boolean;
  setIsLogged: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  authLoading: boolean;
  logout: () => Promise<void>;
  accessToken: string;
  setAccessToken: React.Dispatch<React.SetStateAction<string>>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>("");

  // Restore session on mount: GET /users/me succeeds only if the HttpOnly
  // access_token cookie is valid.
  useEffect(() => {
    api
      .get<User>("/users/me")
      .then(({ data }) => {
        setUser(data);
        setIsLogged(true);
        setAccessToken("cookie"); // sentinel — no real token is ever stored
      })
      .catch(() => {
        setUser(null);
        setIsLogged(false);
        setAccessToken("");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore — cookies may already be gone */
    }
    setIsLogged(false);
    setUser(null);
    setAccessToken("");
  };

  return (
    <AuthContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        authLoading,
        logout,
        accessToken,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
