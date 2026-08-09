// Thin wrappers over the base apiFetch for auth endpoints.
// We call /api/auth directly — no auth token needed for signup/signin.

const API_BASE = import.meta.env.VITE_API_URL || '';

async function authFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed: ${res.status}`);
  return body;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
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
