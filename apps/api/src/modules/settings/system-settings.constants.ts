import { BadRequestException } from '@nestjs/common';

/**
 * Technical/operational settings admin may edit (ADM-002). Keys live in the
 * same `app_settings` table as CMS-001's site settings, but this is a
 * disjoint key set: CMS-001 owns CMS_SETTING_KEYS (content-facing, gated on
 * `content.manage`), this module owns everything else that is currently
 * only changeable by re-running the seed script. A key can only ever belong
 * to one of the two allow-lists.
 */
export interface SystemSettingSchema {
  category: string;
  /** Validates and normalizes raw input into the canonical stored shape. Throws BadRequestException on invalid input. */
  normalize(value: unknown): unknown;
}

const HOURS_BOUNDS = { min: 1, max: 168 } as const; // matches readExpiryHours() in payments.service.ts — writing outside this range would make PaymentsService throw PAYMENT_EXPIRY_NOT_CONFIGURED at booking time.
const DEPOSIT_AMOUNT_BOUNDS = { min: 1, max: 50_000_000 } as const; // sanity ceiling against fat-finger input, not a business limit.
const APP_NAME_MAX_LENGTH = 150;

function normalizeHours(value: unknown): { hours: number } {
  const raw = extractNumber(value, 'hours');
  if (!Number.isInteger(raw) || raw < HOURS_BOUNDS.min || raw > HOURS_BOUNDS.max) {
    throw invalidValue(`Value must be an integer number of hours between ${HOURS_BOUNDS.min} and ${HOURS_BOUNDS.max}`);
  }
  return { hours: raw };
}

function normalizeDepositAmount(value: unknown): { amount: number } {
  const raw = extractNumber(value, 'amount');
  if (!Number.isInteger(raw) || raw < DEPOSIT_AMOUNT_BOUNDS.min || raw > DEPOSIT_AMOUNT_BOUNDS.max) {
    throw invalidValue(`Value must be a positive integer amount between ${DEPOSIT_AMOUNT_BOUNDS.min} and ${DEPOSIT_AMOUNT_BOUNDS.max}`);
  }
  return { amount: raw };
}

function normalizeName(value: unknown): string {
  if (typeof value !== 'string') throw invalidValue('Value must be a string');
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > APP_NAME_MAX_LENGTH) {
    throw invalidValue(`Value must be 1-${APP_NAME_MAX_LENGTH} characters`);
  }
  return trimmed;
}

/** Accepts either a bare number or an object carrying it under `field`, matching what every existing reader in the codebase already tolerates. */
function extractNumber(value: unknown, field: string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null) {
    const nested = (value as Record<string, unknown>)[field];
    if (typeof nested === 'number') return nested;
  }
  return NaN;
}

function invalidValue(message: string): BadRequestException {
  return new BadRequestException({ code: 'SETTING_VALUE_INVALID', message });
}

export const SYSTEM_SETTING_SCHEMAS: Record<string, SystemSettingSchema> = {
  'app.name': { category: 'general', normalize: normalizeName },
  'payment.expiry_hours.room': { category: 'payment', normalize: normalizeHours },
  'payment.expiry_hours.bbq': { category: 'payment', normalize: normalizeHours },
  'bbq.deposit_amount_per_table': { category: 'bbq', normalize: normalizeDepositAmount },
};

export const SYSTEM_SETTING_KEYS: readonly string[] = Object.keys(SYSTEM_SETTING_SCHEMAS);

/** Same Super Admin/Manager gate CMS-001 uses for site settings — these are internal operational parameters, not content Reception needs to see. */
export const SYSTEM_SETTINGS_ROLES: readonly string[] = ['SUPER_ADMIN', 'MANAGER'];
