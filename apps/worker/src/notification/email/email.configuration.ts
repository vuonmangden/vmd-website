import {
  EmailDeliveryError,
  type EmailProviderName,
} from './email.types';

export interface EmailConfiguration {
  apiKey: string | null;
  fromAddress: string;
  fromName: string;
  isProduction: boolean;
  mailpitHost: string;
  mailpitPort: number;
  provider: EmailProviderName;
  replyTo: string;
  resendApiUrl: string;
  timeoutMs: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const DEFAULT_MAILPIT_HOST = '127.0.0.1';
const DEFAULT_MAILPIT_PORT = 1025;
const DEFAULT_RESEND_API_URL = 'https://api.resend.com';
const DEFAULT_TIMEOUT_MS = 10_000;

export function loadEmailConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): EmailConfiguration {
  const appEnvironment = environment['APP_ENV'] ?? environment['NODE_ENV'] ?? '';
  const isProduction = appEnvironment === 'production';
  const provider = readProvider(environment['EMAIL_PROVIDER']);
  const fromName = readHeaderValue(environment['EMAIL_FROM_NAME']);
  const fromAddress = readEmailAddress(environment['EMAIL_FROM_ADDRESS']);
  const replyTo = readEmailAddress(environment['EMAIL_REPLY_TO']);
  const timeoutMs = readPositiveInteger(
    environment['EMAIL_TIMEOUT_MS'],
    DEFAULT_TIMEOUT_MS,
  );

  /**
   * Production email was hard-disabled from NTF-002 onward while PRE-007's
   * domain and SPF/DKIM were outstanding. The owner verified vuonmangden.com
   * in Resend on 2026-09-03, so it opens now — but on the same fail-closed
   * contract as SePay and storage: APP_ENV=production alone is not enough,
   * EMAIL_ENV=production must opt in as well, and the provider must be a real
   * one. A half-configured production deploy refuses to send rather than
   * quietly dropping guest confirmations into a local mail catcher.
   */
  if (isProduction) {
    if (environment['EMAIL_ENV']?.trim().toLowerCase() !== 'production') {
      throw configurationError();
    }
    if (provider !== 'resend') {
      throw configurationError();
    }
  }

  const resendApiUrl = readResendApiUrl(
    environment['RESEND_API_URL'] ?? DEFAULT_RESEND_API_URL,
    isProduction,
  );
  const apiKey = provider === 'resend' ? environment['RESEND_API_KEY']?.trim() || null : null;

  if (provider === 'resend' && !apiKey) {
    throw configurationError();
  }

  return {
    apiKey,
    fromAddress,
    fromName,
    isProduction,
    mailpitHost: environment['MAILPIT_SMTP_HOST']?.trim() || DEFAULT_MAILPIT_HOST,
    mailpitPort: readPositiveInteger(
      environment['MAILPIT_SMTP_PORT'],
      DEFAULT_MAILPIT_PORT,
    ),
    provider,
    replyTo,
    resendApiUrl,
    timeoutMs,
  };
}

function readProvider(value: string | undefined): EmailProviderName {
  if (value === 'mailpit' || value === 'resend') return value;
  throw configurationError();
}

function readHeaderValue(value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized || /[\r\n]/u.test(normalized)) {
    throw configurationError();
  }

  return normalized;
}

function readEmailAddress(value: string | undefined): string {
  const normalized = readHeaderValue(value);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw configurationError();
  }

  return normalized;
}

function readPositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) return defaultValue;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw configurationError();
  }

  return parsed;
}

function readResendApiUrl(value: string, isProduction: boolean): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw configurationError();
  }

  if (isProduction && parsed.protocol !== 'https:') {
    throw configurationError();
  }

  return parsed.toString().replace(/\/$/u, '');
}

function configurationError(): EmailDeliveryError {
  return new EmailDeliveryError('configuration', false, null);
}
