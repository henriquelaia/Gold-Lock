import { api } from './api';

const ACCESS_TOKEN_KEY  = 'goldlock_access_token';
const REFRESH_TOKEN_KEY = 'goldlock_refresh_token';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Token helpers ──────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_TOKEN_KEY,  tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

// ── API calls ──────────────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/register', { name, email, password });
  saveTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
  return data.data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post('/auth/login', { email, password });
  saveTokens({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
  return data.data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
  }
  clearTokens();
}

export async function getMe(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    saveTokens(data.data);
    return data.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}
