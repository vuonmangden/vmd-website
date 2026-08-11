import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwksUrl: string;
}

@Injectable()
export class AuthConfigService {
  get(): AuthConfig {
    const supabaseUrl = requireHttpsUrl('SUPABASE_URL');
    const supabaseAnonKey = requireValue('SUPABASE_ANON_KEY');
    const jwtIssuer = requireHttpsUrl('JWT_ISSUER');
    const jwtAudience = requireValue('JWT_AUDIENCE');
    const jwksUrl = optionalHttpsUrl('SUPABASE_JWKS_URL') ??
      `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    if (jwtIssuer !== expectedIssuer) {
      throw unavailableConfiguration();
    }

    const projectRef = process.env['SUPABASE_PROJECT_REF'];
    const environment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    const urlProjectRef = new URL(supabaseUrl).hostname.split('.')[0];

    if (environment === 'production' || (projectRef !== undefined && projectRef !== urlProjectRef)) {
      throw unavailableConfiguration();
    }

    return { supabaseUrl, supabaseAnonKey, jwtIssuer, jwtAudience, jwksUrl };
  }
}

function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw unavailableConfiguration();
  }

  return value;
}

function requireHttpsUrl(name: string): string {
  const value = optionalHttpsUrl(name);
  if (!value) {
    throw unavailableConfiguration();
  }

  return value;
}

function optionalHttpsUrl(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('invalid URL');
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    throw unavailableConfiguration();
  }
}

function unavailableConfiguration(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'AUTH_CONFIGURATION_UNAVAILABLE',
    message: 'Authentication is currently unavailable',
  });
}
