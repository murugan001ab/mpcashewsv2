import React, { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true while we verify session

  // On mount: hit /auth/me to restore session from httpOnly cookie
  useEffect(() => {
    api.get("users/me")
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

  const logout = async () => {
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};
