import {
  ZaloDeliveryError,
  type ZaloProviderName,
} from './zalo.types';

export interface ZaloConfiguration {
  apiBaseUrl: string;
  enabled: boolean;
  isProduction: boolean;
  provider: ZaloProviderName;
  timeoutMs: number;
}

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:4011';
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Whether Zalo delivery should be attempted at all. Deliberately separate
 * from `loadZaloConfiguration()`, which throws in production while no Zalo
 * Official Account exists — callers that only need to decide "is it worth
 * creating a Zalo job" must be able to ask without that throw.
 *
 * With no OA registered (PRE-007, still open), every confirmed booking would
 * otherwise enqueue a Zalo job that can never send, burying the staff failure
 * inbox in known-impossible failures and making it useless for spotting real
 * ones. Guests are unaffected either way — the email job is independent.
 */
export function isZaloDeliveryEnabled(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment['ZALO_ENABLED'] === 'true';
}

export function loadZaloConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): ZaloConfiguration {
  const appEnvironment = environment['APP_ENV'] ?? environment['NODE_ENV'] ?? '';
  const isProduction = appEnvironment === 'production';
  const enabled = environment['ZALO_ENABLED'] === 'true';
  const provider = readProvider(environment['ZALO_PROVIDER']);
  const timeoutMs = readPositiveInteger(
    environment['ZALO_TIMEOUT_MS'],
    DEFAULT_TIMEOUT_MS,
  );

  if (isProduction) {
    throw configurationError();
  }

  const apiBaseUrl = readApiBaseUrl(
    environment['ZALO_API_BASE_URL'] ?? DEFAULT_API_BASE_URL,
    isProduction,
  );

  return { apiBaseUrl, enabled, isProduction, provider, timeoutMs };
}

function readProvider(value: string | undefined): ZaloProviderName {
  if (value === undefined || value === 'mock') return 'mock';
  throw configurationError();
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

function readApiBaseUrl(value: string, isProduction: boolean): string {
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

function configurationError(): ZaloDeliveryError {
  return new ZaloDeliveryError('configuration', false, null);
}
