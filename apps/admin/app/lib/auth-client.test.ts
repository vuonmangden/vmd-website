import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, login, logout, me, refresh } from './auth-client';

const session = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  tokenType: 'bearer',
};

const actor = {
  staffProfileId: 'profile-id',
  authUserId: '00000000-0000-4000-8000-000000000001',
  fullName: 'Nhân viên thử nghiệm',
  email: 'staff@example.test',
};

describe('admin auth client', () => {
  afterEach(() => {
    clearSession();
    vi.unstubAllGlobals();
  });

  it('keeps a Supabase session in memory, refreshes it, and sends the access token to /auth/me', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { session, actor } }))
      .mockResolvedValueOnce(jsonResponse({ data: { session: { ...session, accessToken: 'rotated-access' }, actor } }))
      .mockResolvedValueOnce(jsonResponse({ data: { actor } }));
    vi.stubGlobal('fetch', fetchMock);

    await login('staff@example.test', 'not-a-real-password');
    await refresh();
    await expect(me()).resolves.toEqual(actor);

    expect(fetchMock.mock.calls[0]?.[0]).toContain('/auth/login');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/auth/refresh');
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({ authorization: 'Bearer rotated-access' });
  });

  it('clears the in-memory session even when logout is rejected', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { session, actor } }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'denied' } }, 401));
    vi.stubGlobal('fetch', fetchMock);
    await login('staff@example.test', 'not-a-real-password');

    await expect(logout()).rejects.toThrow('Authentication failed');
    await expect(me()).rejects.toThrow('No active session');
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
