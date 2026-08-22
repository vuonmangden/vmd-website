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
