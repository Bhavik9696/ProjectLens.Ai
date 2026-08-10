// Thin wrappers over the base apiFetch for auth endpoints.
// We call /api/auth directly — no auth token needed for signup/signin.

// In dev, VITE_API_URL=http://localhost:5000 (see client/.env).
// In production, set VITE_API_URL=https://projectlens-ai.onrender.com in Vercel env vars.
// IMPORTANT: fallback must be an explicit origin — never empty string.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function authFetch(path: string, options?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error(
      'Unable to reach the ProjectLens server. Please check your connection and try again.'
    );
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  freeProjectsRemaining: number;
  paidCredits: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function signUpApi(name: string, email: string, password: string): Promise<AuthResponse> {
  return authFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function signInApi(email: string, password: string): Promise<AuthResponse> {
  return authFetch('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMeApi(token: string): Promise<{ user: AuthUser }> {
  return authFetch('/api/auth/me', {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
}

export async function forgotPasswordApi(email: string): Promise<{ message: string }> {
  return authFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPasswordApi(token: string, newPassword: string): Promise<{ message: string }> {
  return authFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
