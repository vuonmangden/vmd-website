import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, PermissionsGuard } from './roles.guard';
import { StaffRole, Permission } from './roles';

function mockContext(staff?: { role: string }): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ staff }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: 'reception' }))).toBe(true);
  });

  it('allows when staff has required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StaffRole.SUPER_ADMIN]);
    expect(guard.canActivate(mockContext({ role: StaffRole.SUPER_ADMIN }))).toBe(true);
  });

  it('denies when staff has wrong role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StaffRole.SUPER_ADMIN]);
    expect(() => guard.canActivate(mockContext({ role: StaffRole.RECEPTION }))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when no staff on request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StaffRole.MANAGER]);
    expect(() => guard.canActivate(mockContext())).toThrow(ForbiddenException);
  });

  it('allows when staff has one of multiple required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([StaffRole.SUPER_ADMIN, StaffRole.MANAGER]);
    expect(guard.canActivate(mockContext({ role: StaffRole.MANAGER }))).toBe(true);
  });
});

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('allows when no permissions metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(mockContext({ role: StaffRole.RECEPTION }))).toBe(true);
  });

  it('allows super_admin for any permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.USER_MANAGE]);
    expect(guard.canActivate(mockContext({ role: StaffRole.SUPER_ADMIN }))).toBe(true);
  });

  it('allows reception to view bookings', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.BOOKING_VIEW]);
    expect(guard.canActivate(mockContext({ role: StaffRole.RECEPTION }))).toBe(true);
  });

  it('denies reception from managing rooms', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.ROOM_MANAGE]);
    expect(() =>
      guard.canActivate(mockContext({ role: StaffRole.RECEPTION })),
    ).toThrow(ForbiddenException);
  });

  it('denies marketing from viewing bookings', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.BOOKING_VIEW]);
    expect(() =>
      guard.canActivate(mockContext({ role: StaffRole.MARKETING })),
    ).toThrow(ForbiddenException);
  });

  it('allows accountant to manage reconciliation', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.RECONCILIATION_MANAGE]);
    expect(guard.canActivate(mockContext({ role: StaffRole.ACCOUNTANT }))).toBe(true);
  });

  it('denies when staff is missing', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.BOOKING_VIEW]);
    expect(() => guard.canActivate(mockContext())).toThrow(ForbiddenException);
  });

  it('requires all permissions when multiple specified', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.BOOKING_VIEW, Permission.BOOKING_CREATE]);
    expect(guard.canActivate(mockContext({ role: StaffRole.RECEPTION }))).toBe(true);

    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.BOOKING_VIEW, Permission.USER_MANAGE]);
    expect(() =>
      guard.canActivate(mockContext({ role: StaffRole.RECEPTION })),
    ).toThrow(ForbiddenException);
  });
});
