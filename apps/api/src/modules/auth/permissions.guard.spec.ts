import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  it('allows only when every server-side actor permission is present', () => {
    const guard = new PermissionsGuard(reflector(['booking.read', 'booking.update']));
    expect(guard.canActivate(context(['booking.read', 'booking.update']))).toBe(true);
  });

  it('denies missing actors even when the request body forges an admin role', () => {
    const guard = new PermissionsGuard(reflector(['user.manage']));
    expect(() => guard.canActivate(context([], { roles: ['SUPER_ADMIN'], permissions: ['user.manage'] }))).toThrow(ForbiddenException);
  });

  it('denies partial permission matches', () => {
    const guard = new PermissionsGuard(reflector(['booking.read', 'booking.cancel']));
    expect(() => guard.canActivate(context(['booking.read']))).toThrow(ForbiddenException);
  });
});

function reflector(required: string[]): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
}

function context(permissions: string[], forged?: unknown): ExecutionContext {
  const request = permissions.length > 0 ? {
    actor: {
      staffProfileId: '00000000-0000-4000-8000-000000000001',
      authUserId: '00000000-0000-4000-8000-000000000002',
      fullName: 'Test', email: 'test@example.test', roles: ['RECEPTION'], permissions,
    },
    ...(forged ? { body: forged } : {}),
  } : { ...(forged ? { body: forged } : {}) };
  return {
    getHandler: jest.fn(), getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
