import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { isIP } from 'node:net';

const LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://staging.vuonmangden.com',
];

export interface SecurityConfig {
  environment: 'development' | 'test' | 'staging' | 'production';
  corsOrigins: Set<string>;
  trustedProxyIps: Set<string>;
  requestBodyLimit: string;
}

@Injectable()
export class SecurityConfigService {
  get(): SecurityConfig {
    const environment = environmentName();
    const configuredOrigins = readCsv('CORS_ALLOWED_ORIGINS');
    if (environment === 'production' && configuredOrigins.length === 0) {
      throw unavailableConfiguration();
    }

    const corsOrigins = new Set(configuredOrigins.length > 0 ? configuredOrigins : LOCAL_CORS_ORIGINS);
    for (const origin of corsOrigins) validateOrigin(origin);

    const trustedProxyIps = new Set(readCsv('TRUSTED_PROXY_IPS'));
    for (const address of trustedProxyIps) {
      if (isIP(address) === 0) throw unavailableConfiguration();
    }

    const requestBodyLimit = process.env['REQUEST_BODY_LIMIT']?.trim() || '32kb';
    if (!/^\d+(?:kb|mb)$/i.test(requestBodyLimit)) throw unavailableConfiguration();

    return { environment, corsOrigins, trustedProxyIps, requestBodyLimit };
  }
}

function environmentName(): SecurityConfig['environment'] {
  const value = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
  if (value === 'development' || value === 'test' || value === 'staging' || value === 'production') return value;
  throw unavailableConfiguration();
}

function readCsv(name: string): string[] {
  return (process.env[name] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

function validateOrigin(origin: string): void {
  try {
    const url = new URL(origin);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('invalid origin');
    }
  } catch {
    throw unavailableConfiguration();
  }
}

function unavailableConfiguration(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'SECURITY_CONFIGURATION_UNAVAILABLE',
    message: 'Security configuration is currently unavailable',
  });
}
