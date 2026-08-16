export const StaffRole = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  RECEPTION: 'reception',
  MARKETING: 'marketing',
  ACCOUNTANT: 'accountant',
} as const;

export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const Permission = {
  BOOKING_VIEW: 'booking:view',
  BOOKING_CREATE: 'booking:create',
  BOOKING_EDIT: 'booking:edit',
  BOOKING_CANCEL: 'booking:cancel',
  BOOKING_CHECKIN: 'booking:checkin',
  ROOM_MANAGE: 'room:manage',
  ROOM_VIEW: 'room:view',
  RATE_MANAGE: 'rate:manage',
  RATE_VIEW: 'rate:view',
  PAYMENT_MANAGE: 'payment:manage',
  PAYMENT_VIEW: 'payment:view',
  RECONCILIATION_MANAGE: 'reconciliation:manage',
  RECONCILIATION_VIEW: 'reconciliation:view',
  REFUND_APPROVE: 'refund:approve',
  REFUND_REQUEST: 'refund:request',
  CONTENT_MANAGE: 'content:manage',
  VOUCHER_MANAGE: 'voucher:manage',
  VOUCHER_VIEW: 'voucher:view',
  REPORT_FULL: 'report:full',
  REPORT_LIMITED: 'report:limited',
  REPORT_SUMMARY: 'report:summary',
  USER_MANAGE: 'user:manage',
  AUDIT_FULL: 'audit:full',
  AUDIT_LIMITED: 'audit:limited',
  AUDIT_FINANCIAL: 'audit:financial',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  [StaffRole.SUPER_ADMIN]: Object.values(Permission),
  [StaffRole.MANAGER]: [
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_EDIT,
    Permission.BOOKING_CANCEL,
    Permission.BOOKING_CHECKIN,
    Permission.ROOM_MANAGE,
    Permission.RATE_MANAGE,
    Permission.PAYMENT_MANAGE,
    Permission.RECONCILIATION_VIEW,
    Permission.REFUND_REQUEST,
    Permission.CONTENT_MANAGE,
    Permission.VOUCHER_MANAGE,
    Permission.REPORT_FULL,
    Permission.AUDIT_LIMITED,
  ],
  [StaffRole.RECEPTION]: [
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_EDIT,
    Permission.BOOKING_CHECKIN,
    Permission.ROOM_VIEW,
    Permission.PAYMENT_VIEW,
    Permission.REPORT_LIMITED,
  ],
  [StaffRole.MARKETING]: [
    Permission.CONTENT_MANAGE,
    Permission.VOUCHER_MANAGE,
    Permission.REPORT_SUMMARY,
  ],
  [StaffRole.ACCOUNTANT]: [
    Permission.BOOKING_VIEW,
    Permission.RATE_VIEW,
    Permission.PAYMENT_MANAGE,
    Permission.RECONCILIATION_MANAGE,
    Permission.VOUCHER_VIEW,
    Permission.REPORT_FULL,
    Permission.AUDIT_FINANCIAL,
  ],
};

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions !== undefined && permissions.includes(permission);
}
