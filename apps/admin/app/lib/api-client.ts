import { currentAccessToken, refresh } from './auth-client';

/**
 * Shared authenticated fetch for every admin business endpoint (dashboard,
 * bookings, BBQ, payments, CMS, staff, reports, settings). Distinct from
 * auth-client.ts's internal `request()`, which is only for /auth/* calls
 * and always reports failure as "Authentication failed" — callers here need
 * the API's real error code/message (validation errors, 404s, conflicts).
 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

const API_BASE = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3002/api/v1';

/**
 * Attaches the current access token, retrying once through refresh() on a
 * 401 — the same one-retry contract auth-client.ts's meWithRefresh() uses.
 * Throws ApiError with the server's own code/message so callers can show
 * something more useful than a generic failure.
 */
export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = currentAccessToken();
  if (!token) throw new ApiError('Không có phiên đăng nhập', 401, 'NO_SESSION');

  const response = await doFetch(path, token, init);
  if (response.status !== 401) return parse<T>(response);

  try {
    await refresh();
  } catch {
    throw new ApiError('Phiên đăng nhập đã hết hạn', 401, 'SESSION_EXPIRED');
  }

  const retryToken = currentAccessToken();
  if (!retryToken) throw new ApiError('Phiên đăng nhập đã hết hạn', 401, 'SESSION_EXPIRED');
  return parse<T>(await doFetch(path, retryToken, init));
}

function doFetch(path: string, token: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init.headers },
  });
}

async function parse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (isErrorEnvelope(body)) throw new ApiError(body.error.message, response.status, body.error.code);
    throw new ApiError('Yêu cầu thất bại', response.status);
  }

  if (!isDataEnvelope<T>(body)) throw new ApiError('Phản hồi không hợp lệ từ máy chủ', response.status);
  return body.data;
}

function isDataEnvelope<T>(value: unknown): value is { data: T } {
  return typeof value === 'object' && value !== null && 'data' in value;
}

function isErrorEnvelope(value: unknown): value is { error: { message: string; code?: string } } {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string';
}
