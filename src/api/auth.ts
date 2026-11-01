import AsyncStorage from "@react-native-async-storage/async-storage";

const env = typeof process !== "undefined" ? process.env : {};
const SUPABASE_URL = (env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\\/+$/, "");
const SUPABASE_PUBLISHABLE_KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const SESSION_KEY = "comprasfit:api-session:v1";

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string; email?: string };
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  session?: AuthSession | null;
  user: { id: string; email?: string } | null;
};

class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AuthError";
  }
}

function normalizeSession(response: AuthResponse | AuthSession | null): AuthSession | null {
  if (!response) return null;
  const session = "access_token" in response ? response : response.session;
  if (!session?.access_token || !session.refresh_token || !response.user) return null;
  return {
    ...session,
    user: response.user,
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

async function authRequest<T extends AuthResponse>(path: string, body: unknown): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new AuthError("Autenticação online ainda não foi configurada no frontend.", 0);
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  let data: T | { msg?: string; message?: string; error_description?: string };
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    const errorData = data as { msg?: string; message?: string; error_description?: string };
    throw new AuthError(errorData.error_description || errorData.msg || errorData.message || "Falha na autenticação.", response.status);
  }
  return data as T;
}

export function authConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
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
  const response = await authRequest<AuthResponse>("/signup", {
    email: email.trim().toLowerCase(),
    password,
    data: { name: name.trim() },
  });
  const session = normalizeSession(response);
  await saveSession(session);
  return { session, needsEmailConfirmation: !session };
}

export async function signIn(email: string, password: string) {
  const response = await authRequest<AuthResponse>("/token?grant_type=password", {
    email: email.trim().toLowerCase(),
    password,
  });
  const session = normalizeSession(response);
  if (!session) throw new AuthError("O servidor não devolveu uma sessão válida.", 500);
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
    const response = await authRequest<AuthResponse>("/token?grant_type=refresh_token", {
      refresh_token: session.refresh_token,
    });
    const refreshed = normalizeSession(response);
    await saveSession(refreshed);
    return refreshed;
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) await saveSession(null);
    return null;
  }
}
