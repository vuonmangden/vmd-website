/**
 * Site settings admin may edit (CMS-001). Keys live in `app_settings`.
 *
 * `app_settings` also holds technical values that are not part of the CMS
 * surface, so only keys listed here are readable or writable through the
 * admin settings API — an allow-list, not a filter.
 */
export const SITE_SETTING_KEYS = {
  SITE_NAME: 'site.name',
  SITE_TAGLINE: 'site.tagline',
  SITE_LOGO_URL: 'site.logo_url',
  CONTACT_PHONE: 'contact.phone',
  CONTACT_EMAIL: 'contact.email',
  CONTACT_ADDRESS: 'contact.address',
  CONTACT_MAPS_URL: 'contact.maps_url',
  CONTACT_WORKING_HOURS: 'contact.working_hours',
  SOCIAL_FACEBOOK_URL: 'social.facebook_url',
  SOCIAL_ZALO_URL: 'social.zalo_url',
  POLICY_GENERAL: 'policy.general',
  BANNER_MESSAGE: 'banner.message',
  BANNER_ENABLED: 'banner.enabled',
  APP_TIMEZONE: 'app.timezone',
  APP_CURRENCY: 'app.currency',
} as const;

export type SiteSettingKey =
  (typeof SITE_SETTING_KEYS)[keyof typeof SITE_SETTING_KEYS];

export const EDITABLE_SETTING_KEYS: readonly string[] =
  Object.values(SITE_SETTING_KEYS);

/**
 * Timezone and currency change how money and operational dates are
 * interpreted across booking and payment, so they are Super Admin only
 * even though Manager may edit everything else.
 */
export const SUPER_ADMIN_ONLY_KEYS: readonly string[] = [
  SITE_SETTING_KEYS.APP_TIMEZONE,
  SITE_SETTING_KEYS.APP_CURRENCY,
];

/** Roles allowed to read site settings. Accountant is excluded by design. */
export const SETTINGS_READ_ROLES: readonly string[] = [
  'SUPER_ADMIN',
  'MANAGER',
  'RECEPTION',
];

/** Roles allowed to write site settings. */
export const SETTINGS_WRITE_ROLES: readonly string[] = [
  'SUPER_ADMIN',
  'MANAGER',
];

export const SETTING_VALUE_MAX_LENGTH = 5_000;

/** Keys whose value must be a boolean rather than a string. */
export const BOOLEAN_SETTING_KEYS: readonly string[] = [
  SITE_SETTING_KEYS.BANNER_ENABLED,
];

export const SETTINGS_CATEGORY = 'site';
