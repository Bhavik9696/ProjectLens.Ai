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
  /** Sync latest credit counters from the server into the user object */
  refreshCredits: () => Promise<void>;
  /** Optimistically update credit counters after a project is created */
  deductCredit: (type: 'free' | 'paid') => void;
  /** Optimistically add paid credits after a successful payment */
  addPaidCredits: (count: number) => void;
  /** Consume a raw JWT string (e.g. from a Google OAuth redirect) and sign in */
  loginWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
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

  /** Re-fetch the latest credit state from the server */
  const refreshCredits = useCallback(async () => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    try {
      const { user: u } = await getMeApi(stored);
      setUser(u);
    } catch {
      // Silently ignore — stale state is better than crashing
    }
  }, []);

  /** Optimistically decrement a credit after a project is created */
  const deductCredit = useCallback((type: 'free' | 'paid') => {
    setUser((prev) => {
      if (!prev) return prev;
      if (type === 'free') {
        return { ...prev, freeProjectsRemaining: Math.max(0, prev.freeProjectsRemaining - 1) };
      }
      return { ...prev, paidCredits: Math.max(0, prev.paidCredits - 1) };
    });
  }, []);

  /** Optimistically add paid credits after a successful payment */
  const addPaidCredits = useCallback((count: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      return { ...prev, paidCredits: prev.paidCredits + count };
    });
  }, []);

  /** Accept a raw JWT from a URL param (e.g. Google OAuth callback) */
  const loginWithToken = useCallback(async (t: string) => {
    const { user: u } = await getMeApi(t);
    persist(t, u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signUp, signOut, refreshCredits, deductCredit, addPaidCredits, loginWithToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
