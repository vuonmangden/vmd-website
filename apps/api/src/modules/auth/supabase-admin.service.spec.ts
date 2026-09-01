import { ServiceUnavailableException } from '@nestjs/common';
import { SupabaseAdminService } from './supabase-admin.service';

const originalEnvironment = { ...process.env };
const originalFetch = global.fetch;

function configure(overrides: Record<string, string | undefined> = {}): void {
  process.env = {
    ...originalEnvironment,
    APP_ENV: 'staging',
    SUPABASE_URL: 'https://atefkvykvwgtuaiscxnm.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    ...overrides,
  };
}

describe('SupabaseAdminService.inviteUserByEmail', () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
    global.fetch = originalFetch;
  });

  it('posts to the GoTrue admin invite endpoint with the service role key', async () => {
    configure();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '00000000-0000-4000-8000-000000000099' }),
    });
    global.fetch = fetchMock as never;

    const result = await new SupabaseAdminService().inviteUserByEmail('new.staff@example.com');

    expect(result).toEqual({ id: '00000000-0000-4000-8000-000000000099' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1/invite',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-service-role-key',
          Authorization: 'Bearer test-service-role-key',
        }),
        body: JSON.stringify({ email: 'new.staff@example.com' }),
      }),
    );
  });

  it('fails closed in production regardless of configuration', async () => {
    configure({ APP_ENV: 'production' });
    global.fetch = jest.fn() as never;

    await expect(new SupabaseAdminService().inviteUserByEmail('x@example.com')).rejects.toThrow(ServiceUnavailableException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fails closed when SUPABASE_SERVICE_ROLE_KEY is not configured', async () => {
    configure({ SUPABASE_SERVICE_ROLE_KEY: undefined });
    global.fetch = jest.fn() as never;

    await expect(new SupabaseAdminService().inviteUserByEmail('x@example.com')).rejects.toThrow(ServiceUnavailableException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('raises a clear error when the provider call fails', async () => {
    configure();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }) as never;

    await expect(new SupabaseAdminService().inviteUserByEmail('x@example.com')).rejects.toThrow('Could not send staff invite');
  });

  it('raises a clear error when the response has no user id', async () => {
    configure();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as never;

    await expect(new SupabaseAdminService().inviteUserByEmail('x@example.com')).rejects.toThrow('Could not send staff invite');
  });
});
