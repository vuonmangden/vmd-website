export interface AuthenticatedActor {
  staffProfileId: string;
  authUserId: string;
  fullName: string;
  email: string;
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

export class AuthClientError extends Error {}

let currentSession: AuthSession | undefined;

export async function login(email: string, password: string): Promise<AuthSessionResponse> {
  const result = await request<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  currentSession = result.session;
  return result;
}

export async function refresh(): Promise<AuthSessionResponse> {
  if (!currentSession) {
    throw new AuthClientError('No active session');
  }

  const result = await request<AuthSessionResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
  });
  currentSession = result.session;
  return result;
}

export async function me(): Promise<AuthenticatedActor> {
  const session = requireSession();
  const result = await request<{ actor: AuthenticatedActor }>('/auth/me', {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  return result.actor;
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
  }
}

export function clearSession(): void {
  currentSession = undefined;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init.headers },
    });
  } catch {
    throw new AuthClientError('Authentication service is unavailable');
  }

  const payload = await readPayload(response);
  if (!response.ok || !isApiEnvelope<T>(payload)) {
    throw new AuthClientError('Authentication failed');
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
