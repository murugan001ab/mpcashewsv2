// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";

export interface User {
  id?: string | number;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  is_staff?: boolean;
  avatar?: string;
  username?: string;
}

export interface AuthContextType {
  isLogged: boolean;
  setIsLogged: React.Dispatch<React.SetStateAction<boolean>>;
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  authLoading: boolean;
  logout: () => Promise<void>;
  accessToken?: string;
  setAccessToken?: React.Dispatch<React.SetStateAction<string>>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLogged, setIsLogged]     = useState(false);
  const [user, setUser]             = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string>("");

  useEffect(() => {
    api.get<User>("users/me")
      .then(({ data }) => {
        setUser(data);
        setIsLogged(true);
      })
      .catch(() => {
        setUser(null);
        setIsLogged(false);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const logout = async (): Promise<void> => {
    try { await api.post("auth/logout"); } catch { /* ignore */ }
    setIsLogged(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      isLogged, setIsLogged,
      user, setUser,
      authLoading,
      logout,
      accessToken,
      setAccessToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
