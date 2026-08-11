import { AuthConfigService } from './auth.config';

const originalEnvironment = { ...process.env };

describe('AuthConfigService', () => {
  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it('allows a complete staging configuration', () => {
    configure({ APP_ENV: 'staging', SUPABASE_PROJECT_REF: 'atefkvykvwgtuaiscxnm' });

    expect(new AuthConfigService().get()).toMatchObject({
      supabaseUrl: 'https://atefkvykvwgtuaiscxnm.supabase.co',
      jwtAudience: 'authenticated',
    });
  });

  it('fails closed in production without a project identifier', () => {
    configure({ APP_ENV: 'production', SUPABASE_PROJECT_REF: undefined });

    expect(() => new AuthConfigService().get()).toThrow('Authentication is currently unavailable');
  });

  it('fails closed in production even when the staging project ref matches the URL', () => {
    configure({ APP_ENV: 'production', SUPABASE_PROJECT_REF: 'atefkvykvwgtuaiscxnm' });

    expect(() => new AuthConfigService().get()).toThrow('Authentication is currently unavailable');
  });

  it('fails closed when the configured project identifier does not match the URL', () => {
    configure({ APP_ENV: 'staging', SUPABASE_PROJECT_REF: 'wrong-project-ref' });

    expect(() => new AuthConfigService().get()).toThrow('Authentication is currently unavailable');
  });
});

function configure(overrides: Record<string, string | undefined>): void {
  process.env = {
    ...originalEnvironment,
    SUPABASE_URL: 'https://atefkvykvwgtuaiscxnm.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    JWT_ISSUER: 'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1',
    JWT_AUDIENCE: 'authenticated',
    ...overrides,
  };
}
