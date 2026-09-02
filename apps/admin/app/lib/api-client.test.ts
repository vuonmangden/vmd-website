import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminApi, ApiError } from './api-client';
import * as authClient from './auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('adminApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('attaches the current access token and unwraps the { data } envelope', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token-1');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await adminApi<{ ok: boolean }>('/admin/ops/dashboard');

    expect(result).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/ops/dashboard');
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer token-1' });
  });

  it('throws ApiError with no retry when there is no session at all', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminApi('/admin/ops/dashboard')).rejects.toThrow(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes once and retries after a 401, then succeeds', async () => {
    const tokenSpy = vi.spyOn(authClient, 'currentAccessToken').mockReturnValueOnce('stale').mockReturnValue('fresh');
    vi.spyOn(authClient, 'refresh').mockResolvedValue({} as never);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await adminApi<{ ok: boolean }>('/admin/ops/dashboard');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ authorization: 'Bearer fresh' });
    expect(tokenSpy).toHaveBeenCalledTimes(2);
  });

  it('surfaces ApiError with the session-expired reason when the one refresh attempt fails', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('stale');
    vi.spyOn(authClient, 'refresh').mockRejectedValue(new Error('refresh failed'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'expired' } }, 401)));

    await expect(adminApi('/admin/ops/dashboard')).rejects.toMatchObject({ code: 'SESSION_EXPIRED', status: 401 });
  });

  it('surfaces the server error code and message on a non-401 failure', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'Ngày không hợp lệ' } }, 400),
    ));

    await expect(adminApi('/admin/ops/dashboard')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Ngày không hợp lệ',
    });
  });
});
