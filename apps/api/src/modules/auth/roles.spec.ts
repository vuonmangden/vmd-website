import { StaffRole, Permission, ROLE_PERMISSIONS, hasPermission } from './roles';

describe('RBAC permissions', () => {
  it('super_admin has all permissions', () => {
    const allPermissions = Object.values(Permission);
    for (const perm of allPermissions) {
      expect(hasPermission(StaffRole.SUPER_ADMIN, perm)).toBe(true);
    }
  });

  it('reception cannot manage users', () => {
    expect(hasPermission(StaffRole.RECEPTION, Permission.USER_MANAGE)).toBe(false);
  });

  it('reception can view and create bookings', () => {
    expect(hasPermission(StaffRole.RECEPTION, Permission.BOOKING_VIEW)).toBe(true);
    expect(hasPermission(StaffRole.RECEPTION, Permission.BOOKING_CREATE)).toBe(true);
  });

  it('marketing can manage content but not bookings', () => {
    expect(hasPermission(StaffRole.MARKETING, Permission.CONTENT_MANAGE)).toBe(true);
    expect(hasPermission(StaffRole.MARKETING, Permission.BOOKING_VIEW)).toBe(false);
  });

  it('accountant can manage payments and reconciliation', () => {
    expect(hasPermission(StaffRole.ACCOUNTANT, Permission.PAYMENT_MANAGE)).toBe(true);
    expect(hasPermission(StaffRole.ACCOUNTANT, Permission.RECONCILIATION_MANAGE)).toBe(true);
  });

  it('accountant cannot manage rooms or content', () => {
    expect(hasPermission(StaffRole.ACCOUNTANT, Permission.ROOM_MANAGE)).toBe(false);
    expect(hasPermission(StaffRole.ACCOUNTANT, Permission.CONTENT_MANAGE)).toBe(false);
  });

  it('manager can request refund but not approve', () => {
    expect(hasPermission(StaffRole.MANAGER, Permission.REFUND_REQUEST)).toBe(true);
    expect(hasPermission(StaffRole.MANAGER, Permission.REFUND_APPROVE)).toBe(false);
  });

  it('every role has a permission array', () => {
    for (const role of Object.values(StaffRole)) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });
});
