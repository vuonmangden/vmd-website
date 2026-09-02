/**
 * Mirrors the two allow-lists the API enforces (site-settings.constants.ts,
 * system-settings.constants.ts) — kept as a small UI-owned copy the same way
 * bbq/transitions.ts mirrors the server's transition map. Worst case if this
 * ever drifts from the server is a field that 400s with a clear message, not
 * a wrong write — the server is still the source of truth on both key lists
 * and validation.
 */
export interface SiteSettingField {
  key: string;
  label: string;
  kind: 'text' | 'boolean';
  superAdminOnly?: boolean;
}

export const SITE_SETTING_FIELDS: readonly SiteSettingField[] = [
  { key: 'site.name', label: 'Tên website', kind: 'text' },
  { key: 'site.tagline', label: 'Khẩu hiệu', kind: 'text' },
  { key: 'site.logo_url', label: 'URL logo', kind: 'text' },
  { key: 'contact.phone', label: 'Số điện thoại', kind: 'text' },
  { key: 'contact.email', label: 'Email liên hệ', kind: 'text' },
  { key: 'contact.address', label: 'Địa chỉ', kind: 'text' },
  { key: 'contact.maps_url', label: 'Link Google Maps', kind: 'text' },
  { key: 'contact.working_hours', label: 'Giờ làm việc', kind: 'text' },
  { key: 'social.facebook_url', label: 'Link Facebook', kind: 'text' },
  { key: 'social.zalo_url', label: 'Link Zalo', kind: 'text' },
  { key: 'policy.general', label: 'Chính sách chung', kind: 'text' },
  { key: 'banner.message', label: 'Nội dung banner', kind: 'text' },
  { key: 'banner.enabled', label: 'Bật banner', kind: 'boolean' },
  { key: 'app.timezone', label: 'Múi giờ', kind: 'text', superAdminOnly: true },
  { key: 'app.currency', label: 'Đơn vị tiền tệ', kind: 'text', superAdminOnly: true },
];

export type SystemFieldKind = 'text' | 'hours' | 'amount';

export interface SystemSettingField {
  key: string;
  label: string;
  kind: SystemFieldKind;
}

export const SYSTEM_SETTING_FIELDS: readonly SystemSettingField[] = [
  { key: 'app.name', label: 'Tên ứng dụng', kind: 'text' },
  { key: 'payment.expiry_hours.room', label: 'Hết hạn thanh toán phòng (giờ)', kind: 'hours' },
  { key: 'payment.expiry_hours.bbq', label: 'Hết hạn thanh toán BBQ (giờ)', kind: 'hours' },
  { key: 'bbq.deposit_amount_per_table', label: 'Cọc BBQ mỗi bàn (đ)', kind: 'amount' },
];

/** `{ hours: number }` -> the number, or null if the shape doesn't match (unset key, or a secret-reference row masked to null). */
export function extractHours(value: unknown): number | null {
  return extractField(value, 'hours');
}

/** `{ amount: number }` -> the number, same contract as extractHours. */
export function extractAmount(value: unknown): number | null {
  return extractField(value, 'amount');
}

function extractField(value: unknown, field: string): number | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === 'number' ? candidate : null;
}
