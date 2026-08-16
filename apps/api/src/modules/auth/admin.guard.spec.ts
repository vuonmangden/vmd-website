import { type ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminGuard } from './admin.guard';
import { StaffRole, Permission } from './roles';
import type { SupabaseAuthGuard } from './supabase-auth.guard';

function mockContext(staff?: { role: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ staff }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authGuard: { canActivate: jest.Mock };
  let reflector: Reflector;

  beforeEach(() => {
    authGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    reflector = new Reflector();
    guard = new AdminGuard(
      authGuard as unknown as SupabaseAuthGuard,
      reflector,
    );
  });

  it('rejects unauthenticated requests', async () => {
    authGuard.canActivate.mockRejectedValue(new UnauthorizedException());
    await expect(guard.canActivate(mockContext())).rejects.toThrow(UnauthorizedException);
  });

  it('allows authenticated staff with no role/permission requirements', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext({ role: StaffRole.RECEPTION }));
    expect(result).toBe(true);
  });

  it('enforces role requirements', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([StaffRole.SUPER_ADMIN])
      .mockReturnValueOnce(undefined);

    await expect(
      guard.canActivate(mockContext({ role: StaffRole.RECEPTION })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows matching role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce([StaffRole.MANAGER, StaffRole.SUPER_ADMIN])
      .mockReturnValueOnce(undefined);

    const result = await guard.canActivate(mockContext({ role: StaffRole.MANAGER }));
    expect(result).toBe(true);
  });

  it('enforces permission requirements', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce([Permission.USER_MANAGE]);

    await expect(
      guard.canActivate(mockContext({ role: StaffRole.RECEPTION })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows when staff has required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce([Permission.BOOKING_VIEW]);

    const result = await guard.canActivate(mockContext({ role: StaffRole.RECEPTION }));
    expect(result).toBe(true);
  });
});
