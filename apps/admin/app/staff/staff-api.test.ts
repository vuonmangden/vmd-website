import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignStaffRole, changeStaffStatus, getStaff, inviteStaff, listStaff, revokeStaffRole } from './staff-api';
import * as authClient from '../lib/auth-client';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('staff-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds the query string for listStaff with only the filters given', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [], page: 1, pageSize: 50, total: 0 } }));
    vi.stubGlobal('fetch', fetchMock);

    await listStaff({ status: 'ACTIVE', page: 2 });

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain('/admin/staff?');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=50');
  });

  it('fetches one staff profile by id', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await getStaff('s1');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/staff/s1');
  });

  it('invites a staff member with email, full name, and a starting role', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's1' } }));
    vi.stubGlobal('fetch', fetchMock);

    await inviteStaff({ email: 'a@vuonmangden.com', fullName: 'Nguyễn Văn A', roleCode: 'RECEPTION' });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/staff/invite');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ email: 'a@vuonmangden.com', fullName: 'Nguyễn Văn A', roleCode: 'RECEPTION' });
  });

  it('changes staff status with a PATCH, including the reason only when given', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's1', status: 'SUSPENDED' } }));
    vi.stubGlobal('fetch', fetchMock);

    await changeStaffStatus('s1', 'SUSPENDED', 'Nghỉ việc');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/staff/s1/status');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ status: 'SUSPENDED', reason: 'Nghỉ việc' });
  });

  it('omits the reason from the status body when not given', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's1', status: 'ACTIVE' } }));
    vi.stubGlobal('fetch', fetchMock);

    await changeStaffStatus('s1', 'ACTIVE');

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ status: 'ACTIVE' });
  });

  it('assigns a role with a POST', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { assigned: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await assignStaffRole('s1', 'MANAGER');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/staff/s1/roles');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ roleCode: 'MANAGER' });
  });

  it('revokes a role with a DELETE to the role-coded path', async () => {
    vi.spyOn(authClient, 'currentAccessToken').mockReturnValue('token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { revoked: true } }));
    vi.stubGlobal('fetch', fetchMock);

    await revokeStaffRole('s1', 'MANAGER');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3002/api/v1/admin/staff/s1/roles/MANAGER');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
  });
});
