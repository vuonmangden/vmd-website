import type { PrismaClient } from '@prisma/client';

export const PERMISSION_CODES = [
  'booking.read',
  'booking.create',
  'booking.update',
  'booking.cancel',
  'booking.checkin',
  'booking.checkout',
  'payment.read',
  'payment.reconcile',
  'payment.refund_request',
  'room.manage',
  'bbq.manage',
  'content.manage',
  'report.read',
  'user.manage',
  'audit.read',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const ROLE_PERMISSION_MATRIX = {
  SUPER_ADMIN: [...PERMISSION_CODES],
  MANAGER: [
    'booking.read', 'booking.create', 'booking.update', 'booking.cancel',
    'booking.checkin', 'booking.checkout', 'payment.read', 'payment.reconcile',
    'room.manage', 'bbq.manage', 'content.manage', 'report.read', 'audit.read',
  ],
  RECEPTION: [
    'booking.read', 'booking.create', 'booking.update', 'booking.cancel',
    'booking.checkin', 'booking.checkout', 'payment.read', 'room.manage',
    'bbq.manage', 'report.read',
  ],
  ACCOUNTANT: [
    'booking.read', 'payment.read', 'payment.reconcile', 'payment.refund_request',
    'report.read', 'audit.read',
  ],
  MARKETING: ['content.manage', 'report.read'],
} as const satisfies Record<string, readonly PermissionCode[]>;

export type RoleCode = keyof typeof ROLE_PERMISSION_MATRIX;

const ROLE_NAMES: Record<RoleCode, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  RECEPTION: 'Reception / Operations',
  ACCOUNTANT: 'Accountant',
  MARKETING: 'Marketing / Content',
};

export async function seedRbac(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const permissions = new Map<string, string>();
    for (const code of PERMISSION_CODES) {
      const permission = await tx.permission.upsert({
        where: { code },
        update: { name: code },
        create: { code, name: code },
        select: { id: true },
      });
      permissions.set(code, permission.id);
    }

    for (const [code, permissionCodes] of Object.entries(ROLE_PERMISSION_MATRIX) as [RoleCode, readonly PermissionCode[]][]) {
      const role = await tx.role.upsert({
        where: { code },
        update: { name: ROLE_NAMES[code], isSystem: true },
        create: { code, name: ROLE_NAMES[code], isSystem: true },
        select: { id: true },
      });

      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      await tx.rolePermission.createMany({
        data: permissionCodes.map((permissionCode) => ({
          roleId: role.id,
          permissionId: requirePermissionId(permissions, permissionCode),
        })),
      });
    }
  });
}

function requirePermissionId(permissions: Map<string, string>, code: PermissionCode): string {
  const id = permissions.get(code);
  if (!id) throw new Error(`Missing seeded permission: ${code}`);
  return id;
}
