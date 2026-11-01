import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiConfigured, apiRequest, type ApiError } from "./client";

const SESSION_KEY = "comprasfit:api-session:v1";

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string; email?: string };
};

type AuthResponse = {
  session: AuthSession | null;
  user: { id: string; email?: string } | null;
};

function normalizeSession(session: AuthSession | null): AuthSession | null {
  if (!session) return null;
  return {
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
  };
}

async function saveSession(session: AuthSession | null) {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function authConfigured() {
  return apiConfigured;
}

export async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? normalizeSession(JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export async function signUp(name: string, email: string, password: string) {
  const response = await apiRequest<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: { name: name.trim(), email: email.trim().toLowerCase(), password },
  });
  const session = normalizeSession(response.session);
  await saveSession(session);
  return { session, needsEmailConfirmation: !session };
}

export async function signIn(email: string, password: string) {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  const session = normalizeSession(response.session);
  if (!session) throw new Error("O servidor não devolveu uma sessão válida.");
  await saveSession(session);
  return session;
}

export async function signOut() {
  await saveSession(null);
}

export async function getValidSession(session: AuthSession | null): Promise<AuthSession | null> {
  if (!session) return null;
  const expiresAt = session.expires_at ?? 0;
  if (expiresAt > Math.floor(Date.now() / 1000) + 60) return session;

  try {
    const response = await apiRequest<AuthResponse>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: session.refresh_token },
    });
    const refreshed = normalizeSession(response.session);
    await saveSession(refreshed);
    return refreshed;
  } catch (error) {
    if ((error as ApiError).status === 401) await saveSession(null);
    return null;
  }
}
