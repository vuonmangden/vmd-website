import { type ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import type { StaffService } from './staff.service';

function createJwt(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('SupabaseAuthGuard', () => {
  const TEST_SECRET = 'test-jwt-secret-for-unit-tests';
  let guard: SupabaseAuthGuard;
  let staffService: { findByAuthUserId: jest.Mock };

  function mockContext(authHeader?: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    process.env['SUPABASE_JWT_SECRET'] = TEST_SECRET;
    staffService = { findByAuthUserId: jest.fn() };
    guard = new SupabaseAuthGuard(staffService as unknown as StaffService);
  });

  afterEach(() => {
    delete process.env['SUPABASE_JWT_SECRET'];
  });

  it('rejects request without authorization header', async () => {
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects request with non-Bearer token', async () => {
    await expect(guard.canActivate(mockContext('Basic abc'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects invalid token format', async () => {
    await expect(guard.canActivate(mockContext('Bearer not-a-jwt'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects token with wrong signature', async () => {
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      'wrong-secret',
    );
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired token', async () => {
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) - 60 },
      TEST_SECRET,
    );
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when staff not found', async () => {
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET,
    );
    staffService.findByAuthUserId.mockResolvedValue(null);

    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects inactive staff with 403', async () => {
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET,
    );
    staffService.findByAuthUserId.mockResolvedValue({
      id: 'staff-1',
      authUserId: 'user-1',
      isActive: false,
    });

    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows valid token with active staff', async () => {
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET,
    );
    const staff = { id: 'staff-1', authUserId: 'user-1', isActive: true };
    staffService.findByAuthUserId.mockResolvedValue(staff);

    const result = await guard.canActivate(mockContext(`Bearer ${token}`));

    expect(result).toBe(true);
    expect(staffService.findByAuthUserId).toHaveBeenCalledWith('user-1');
  });

  it('rejects when SUPABASE_JWT_SECRET is missing', async () => {
    delete process.env['SUPABASE_JWT_SECRET'];
    const token = createJwt(
      { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + 3600 },
      TEST_SECRET,
    );

    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
