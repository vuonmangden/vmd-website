import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import type { AuthenticatedActor, AuthSessionResponse } from './auth.types';

const ACTOR: AuthenticatedActor = { staffProfileId: 'staff-1', authUserId: 'auth-1', fullName: 'Staff Test', email: 'staff@example.com', roles: ['RECEPTION'], permissions: ['booking.read'] };
const SESSION: AuthSessionResponse = {
  session: { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600, tokenType: 'bearer' },
  actor: ACTOR,
};
const SECURITY_CONFIG = { environment: 'test' as const, corsOrigins: new Set<string>(), trustedProxyIps: new Set<string>(), requestBodyLimit: '32kb' };

function services(overrides?: { login?: jest.Mock }) {
  const authService = {
    login: overrides?.login ?? jest.fn().mockResolvedValue(SESSION),
    refresh: jest.fn().mockResolvedValue(SESSION),
    logout: jest.fn().mockResolvedValue({ revoked: true }),
    getActorForRequest: jest.fn().mockResolvedValue(ACTOR),
  };
  const loginRateLimit = { assertAllowed: jest.fn(), recordFailure: jest.fn(), resetAccount: jest.fn() };
  const securityConfig = { get: jest.fn().mockReturnValue(SECURITY_CONFIG) };
  return { authService, loginRateLimit, securityConfig };
}

function request(overrides?: Partial<{ headers: Record<string, unknown>; socket: { remoteAddress: string } }>) {
  return {
    headers: { 'x-correlation-id': 'corr-1', ...overrides?.headers },
    socket: overrides?.socket ?? { remoteAddress: '203.0.113.5' },
  } as never;
}

describe('AuthController.login', () => {
  it('normalizes the email, checks the rate limit, and resets it on success', async () => {
    const { authService, loginRateLimit, securityConfig } = services();
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    const result = await controller.login({ email: ' Staff@Example.com ', password: 'pw' }, request());

    expect(loginRateLimit.assertAllowed).toHaveBeenCalledWith('staff@example.com', '203.0.113.5');
    expect(authService.login).toHaveBeenCalledWith('staff@example.com', 'pw', 'corr-1');
    expect(loginRateLimit.resetAccount).toHaveBeenCalledWith('staff@example.com');
    expect(loginRateLimit.recordFailure).not.toHaveBeenCalled();
    expect(result).toBe(SESSION);
  });

  it('records a rate-limit failure and re-throws on invalid credentials', async () => {
    const login = jest.fn().mockRejectedValue(new UnauthorizedException({ code: 'AUTHENTICATION_FAILED', message: 'Authentication failed' }));
    const { authService, loginRateLimit, securityConfig } = services({ login });
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await expect(controller.login({ email: 'staff@example.com', password: 'wrong' }, request())).rejects.toBeInstanceOf(UnauthorizedException);

    expect(loginRateLimit.recordFailure).toHaveBeenCalledWith('staff@example.com', '203.0.113.5');
    expect(loginRateLimit.resetAccount).not.toHaveBeenCalled();
  });

  it('does not record a rate-limit failure for a non-authentication error', async () => {
    const login = jest.fn().mockRejectedValue(new ServiceUnavailableException({ code: 'AUTH_PROVIDER_UNAVAILABLE', message: 'Provider unavailable' }));
    const { authService, loginRateLimit, securityConfig } = services({ login });
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await expect(controller.login({ email: 'staff@example.com', password: 'pw' }, request())).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(loginRateLimit.recordFailure).not.toHaveBeenCalled();
  });
});

describe('AuthController.refresh/logout/me', () => {
  it('refresh delegates the token and correlation id', async () => {
    const { authService, loginRateLimit, securityConfig } = services();
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await expect(controller.refresh({ refreshToken: 'rt-1' }, request())).resolves.toBe(SESSION);
    expect(authService.refresh).toHaveBeenCalledWith('rt-1', 'corr-1');
  });

  it('logout extracts the authorization header and delegates', async () => {
    const { authService, loginRateLimit, securityConfig } = services();
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await expect(controller.logout(request({ headers: { authorization: 'Bearer token-1' } }))).resolves.toEqual({ revoked: true });
    expect(authService.logout).toHaveBeenCalledWith('Bearer token-1', 'corr-1');
  });

  it('logout takes the first value when the authorization header arrives as an array', async () => {
    const { authService, loginRateLimit, securityConfig } = services();
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await controller.logout(request({ headers: { authorization: ['Bearer first', 'Bearer second'] } }));
    expect(authService.logout).toHaveBeenCalledWith('Bearer first', 'corr-1');
  });

  it('me resolves the trusted actor for the request', async () => {
    const { authService, loginRateLimit, securityConfig } = services();
    const controller = new AuthController(authService as never, loginRateLimit as never, securityConfig as never);

    await expect(controller.me(request())).resolves.toEqual({ actor: ACTOR });
    expect(authService.getActorForRequest).toHaveBeenCalledWith(expect.anything(), 'corr-1');
  });
});
