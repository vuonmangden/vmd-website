import { describe, expect, it } from 'vitest';
import { ROLE_OPTIONS, roleName } from './roles';

describe('roles', () => {
  it('lists the five seeded system roles', () => {
    expect(ROLE_OPTIONS.map((option) => option.code)).toEqual(['SUPER_ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTANT', 'MARKETING']);
  });

  describe('roleName', () => {
    it('resolves a known role code to its display name', () => {
      expect(roleName('MANAGER')).toBe('Manager');
    });

    it('falls back to the raw code for an unknown role', () => {
      expect(roleName('UNKNOWN_ROLE')).toBe('UNKNOWN_ROLE');
    });
  });
});
