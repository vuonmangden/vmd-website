/**
 * Mirrors the fixed system role catalog seeded by `prisma/rbac-seed.ts`
 * (`ROLE_PERMISSION_MATRIX`/`ROLE_NAMES`) — there is no list-roles endpoint
 * because these five codes are seeded, not user-editable data. If the seed
 * ever grows a new role, this list needs a matching entry; until then the
 * failure mode of drift is a clear 400 `ROLE_NOT_FOUND` from the server, not
 * a silent wrong assignment.
 */
export interface RoleOption {
  code: string;
  name: string;
}

export const ROLE_OPTIONS: readonly RoleOption[] = [
  { code: 'SUPER_ADMIN', name: 'Super Admin' },
  { code: 'MANAGER', name: 'Manager' },
  { code: 'RECEPTION', name: 'Reception / Operations' },
  { code: 'ACCOUNTANT', name: 'Accountant' },
  { code: 'MARKETING', name: 'Marketing / Content' },
];

export function roleName(code: string): string {
  return ROLE_OPTIONS.find((option) => option.code === code)?.name ?? code;
}
