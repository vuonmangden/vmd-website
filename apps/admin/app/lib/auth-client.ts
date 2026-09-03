export interface AuthenticatedActor {
  staffProfileId: string;
  authUserId: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSessionResponse {
  session: AuthSession;
  actor: AuthenticatedActor;
}

interface ApiEnvelope<T> {
  data: T;
}

export type AuthFailureKind = 'unauthorized' | 'forbidden' | 'unavailable' | 'unknown';

export class AuthClientError extends Error {
  constructor(message: string, readonly kind: AuthFailureKind = 'unknown') {
    super(message);
  }
}

/**
 * Held in memory for the lifetime of the tab, and mirrored to localStorage
 * so a page reload or a direct link into a deep admin route doesn't bounce
 * the user back to /login. Bearer tokens in localStorage are readable by
 * any script on the page — an accepted tradeoff of the Bearer-only design
 * IAM-005 chose over cookies (see its CSRF note); XSS-hardening is SEC-001/002.
 */
let currentSession: AuthSession | undefined;

export async function login(email: string, password: string): Promise<AuthSessionResponse> {
  const result = await request<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  currentSession = result.session;
  persistSession(result.session);
  return result;
}

export async function refresh(): Promise<AuthSessionResponse> {
  const session = currentSession ?? loadPersistedSession();
  if (!session) {
    throw new AuthClientError('No active session');
  }

  const result = await request<AuthSessionResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  currentSession = result.session;
  persistSession(result.session);
  return result;
}

export async function me(): Promise<AuthenticatedActor> {
  const session = requireSession();
  const result = await request<{ actor: AuthenticatedActor }>('/auth/me', {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  return result.actor;
}

export async function meWithRefresh(): Promise<AuthenticatedActor> {
  try {
    return await me();
  } catch (error) {
    if (!(error instanceof AuthClientError) || error.kind !== 'unauthorized') throw error;
  }

  try {
    await refresh();
    return await me();
  } catch (error) {
    clearSession();
    throw error;
  }
}

export function hasSession(): boolean {
  currentSession ??= loadPersistedSession();
  return currentSession !== undefined;
}

/** For attaching to business API requests (see lib/api-client.ts). Does not itself verify the token is still valid — a 401 means call refresh() and retry once, the same contract meWithRefresh() already follows. */
export function currentAccessToken(): string | undefined {
  currentSession ??= loadPersistedSession();
  return currentSession?.accessToken;
}

export async function logout(): Promise<void> {
  const session = requireSession();
  try {
    await request('/auth/logout', {
      method: 'POST',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
  } finally {
    currentSession = undefined;
    clearPersistedSession();
  }
}

export function clearSession(): void {
  currentSession = undefined;
  clearPersistedSession();
}

const SESSION_STORAGE_KEY = 'vmd-admin-session';

function loadPersistedSession(): AuthSession | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isAuthSession(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function persistSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can fail (private browsing, quota exceeded) — the tab still
    // works off the in-memory copy for the rest of its own lifetime.
  }
}

function clearPersistedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function isAuthSession(value: unknown): value is AuthSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Partial<AuthSession>).accessToken === 'string' &&
    typeof (value as Partial<AuthSession>).refreshToken === 'string'
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch {
    throw new AuthClientError('Authentication service is unavailable', 'unavailable');
  }

  const payload = await readPayload(response);
  if (!response.ok || !isApiEnvelope<T>(payload)) {
    const kind = response.status === 401 ? 'unauthorized'
      : response.status === 403 ? 'forbidden'
        : response.status >= 500 ? 'unavailable' : 'unknown';
    throw new AuthClientError('Authentication failed', kind);
  }

  return payload.data;
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function requireSession(): AuthSession {
  currentSession ??= loadPersistedSession();
  if (!currentSession) {
    throw new AuthClientError('No active session');
  }

  return currentSession;
}

function apiBaseUrl(): string {
  return process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3002/api/v1';
}

function isApiEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return typeof value === 'object' && value !== null && 'data' in value;
}
