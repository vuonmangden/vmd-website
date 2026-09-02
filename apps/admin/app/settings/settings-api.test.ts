import { afterEach, describe, expect, it, vi } from 'vitest';
import { listSiteSettings, listSystemSettings, updateSiteSetting, updateSystemSetting } from './settings-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('settings-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists site settings from /admin/site-settings', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listSiteSettings();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/site-settings');
  });

  it('updates a site setting with a PUT carrying { key, value }', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { key: 'site.name', value: 'X', updatedAt: '2026-09-01T00:00:00.000Z' } }));
    vi.stubGlobal('fetch', fetchMock);

    await updateSiteSetting('site.name', 'X');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/site-settings');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ key: 'site.name', value: 'X' });
  });

  it('lists system settings from /admin/settings', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await listSystemSettings();

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/settings');
  });

  it('updates a system setting, omitting expectedUpdatedAt when not given', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await updateSystemSetting('app.name', { hours: 24 });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ key: 'app.name', value: { hours: 24 } });
  });

  it('passes expectedUpdatedAt through when given, for optimistic-concurrency callers', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: {} }));
    vi.stubGlobal('fetch', fetchMock);

    await updateSystemSetting('app.name', 'X', '2026-09-01T00:00:00.000Z');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      key: 'app.name', value: 'X', expectedUpdatedAt: '2026-09-01T00:00:00.000Z',
    });
  });
});
