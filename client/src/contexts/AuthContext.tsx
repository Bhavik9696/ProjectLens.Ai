import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthUser, getMeApi, signInApi, signUpApi } from '../services/authApi';

const TOKEN_KEY = 'projectlens-token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true until session is restored

  // On mount: attempt to restore session from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    getMeApi(stored)
      .then(({ user: u }) => {
        setToken(stored);
        setUser(u);
      })
      .catch(() => {
        // Token expired or invalid — clear it
        window.localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const persist = (t: string, u: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await signInApi(email, password);
    persist(t, u);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { token: t, user: u } = await signUpApi(name, email, password);
    persist(t, u);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
