import type { NotificationProvider } from './notification-provider';
import { ResendEmailProvider } from './resend-email.provider';
import { LogEmailProvider } from './log-email.provider';

export const EMAIL_PROVIDER_NAMES = {
  RESEND: 'resend',
  LOG: 'log',
} as const;

export type EmailProviderName =
  (typeof EMAIL_PROVIDER_NAMES)[keyof typeof EMAIL_PROVIDER_NAMES];

/**
 * Selects the email adapter from EMAIL_PROVIDER.
 *
 * Production must never fall back to the log adapter: silently dropping a
 * booking confirmation is worse than failing loudly at startup, so an
 * unset or non-real provider throws instead of degrading (deny-by-default,
 * Security Baseline §1).
 */
export function createEmailProvider(
  providerName: string | undefined,
  nodeEnv: string | undefined,
): NotificationProvider {
  const isProduction = nodeEnv === 'production';

  if (providerName === EMAIL_PROVIDER_NAMES.RESEND) {
    return new ResendEmailProvider();
  }

  if (isProduction) {
    throw new Error(
      `EMAIL_PROVIDER must be "${EMAIL_PROVIDER_NAMES.RESEND}" in production, received "${providerName ?? 'unset'}"`,
    );
  }

  return new LogEmailProvider();
}
