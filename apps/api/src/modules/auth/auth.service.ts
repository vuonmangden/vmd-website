import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { PrismaService } from '../../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { AuthConfigService } from './auth.config';
import { JwtVerificationError } from './supabase-jwt-verifier.service';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import type {
  AuthenticatedActor,
  AuthenticatedRequest,
  AuthSessionResponse,
  SupabaseSession,
} from './auth.types';

interface StaffProfileActorRecord {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  status: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly fetchFn = fetch;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AuthConfigService,
    private readonly jwtVerifier: SupabaseJwtVerifier,
  ) {}

  async login(email: string, password: string, correlationId: string): Promise<AuthSessionResponse> {
    const session = await this.requestSession(
      '/auth/v1/token?grant_type=password',
      { email, password },
      correlationId,
    );

    return this.resolveSession(session, correlationId);
  }

  async refresh(refreshToken: string, correlationId: string): Promise<AuthSessionResponse> {
    const session = await this.requestSession(
      '/auth/v1/token?grant_type=refresh_token',
      { refresh_token: refreshToken },
      correlationId,
    );

    return this.resolveSession(session, correlationId);
  }

  async logout(authorization: string | undefined, correlationId: string): Promise<{ revoked: true }> {
    const accessToken = extractBearerToken(authorization);
    await this.verifyAccessToken(accessToken, correlationId);

    const config = this.config.get();
    let response: Response;
    try {
      response = await this.fetchFn(`${config.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: config.supabaseAnonKey,
          authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw authUnavailable();
    }

    if (!response.ok) {
      this.logFailure(correlationId, 'logout_rejected');
      throw authenticationFailed();
    }

    return { revoked: true };
  }

  async getActorForRequest(request: Request, correlationId: string): Promise<AuthenticatedActor> {
    const authorization = getHeader(request, 'authorization');
    const accessToken = extractBearerToken(authorization);
    const verified = await this.verifyAccessToken(accessToken, correlationId);

    let profile: StaffProfileActorRecord | null;
    try {
      profile = await this.prisma.staffProfile.findUnique({
        where: { authUserId: verified.authUserId },
        select: { id: true, authUserId: true, fullName: true, email: true, status: true },
      });
    } catch {
      this.logFailure(correlationId, 'profile_lookup_unavailable');
      throw authUnavailable();
    }

    if (!profile || profile.status !== 'ACTIVE') {
      this.logFailure(correlationId, profile ? 'inactive_profile' : 'missing_profile');
      throw authenticationFailed();
    }

    const actor: AuthenticatedActor = {
      staffProfileId: profile.id,
      authUserId: profile.authUserId,
      fullName: profile.fullName,
      email: profile.email,
    };
    (request as AuthenticatedRequest).actor = actor;
    return actor;
  }

  private async resolveSession(session: SupabaseSession, correlationId: string): Promise<AuthSessionResponse> {
    const request = { headers: { authorization: `Bearer ${session.accessToken}` } } as Request;
    try {
      const actor = await this.getActorForRequest(request, correlationId);
      await this.prisma.staffProfile.update({
        where: { authUserId: actor.authUserId },
        data: { lastLoginAt: new Date() },
      });
      return { session, actor };
    } catch (error) {
      await this.revokeSession(session.accessToken);
      if (error instanceof UnauthorizedException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logFailure(correlationId, 'profile_update_unavailable');
      throw authUnavailable();
    }
  }

  private async verifyAccessToken(accessToken: string, correlationId: string) {
    try {
      return await this.jwtVerifier.verify(accessToken, this.config.get());
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logFailure(
        correlationId,
        error instanceof JwtVerificationError ? error.reason : 'verification_failed',
      );
      throw authenticationFailed();
    }
  }

  private async requestSession(
    path: string,
    body: Record<string, string>,
    correlationId: string,
  ): Promise<SupabaseSession> {
    const config = this.config.get();
    let response: Response;
    try {
      response = await this.fetchFn(`${config.supabaseUrl}${path}`, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey, 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      throw authUnavailable();
    }

    if (response.status >= 500) {
      throw authUnavailable();
    }

    if (!response.ok) {
      this.logFailure(correlationId, 'provider_rejected_credentials');
      throw authenticationFailed();
    }

    const payload = await readJson(response, correlationId, this.logFailure.bind(this));
    return parseSession(payload, correlationId, this.logFailure.bind(this));
  }

  private async revokeSession(accessToken: string): Promise<void> {
    try {
      const config = this.config.get();
      await this.fetchFn(`${config.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey, authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // The protected operation remains denied even if Supabase is temporarily unavailable.
    }
  }

  private logFailure(correlationId: string, reason: string): void {
    this.logger.warn({ correlationId, event: 'auth_failure', reason });
  }
}

function extractBearerToken(authorization: string | undefined): string {
  const match = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization ?? '');
  if (!match?.[1]) {
    throw authenticationFailed();
  }

  return match[1];
}

function getHeader(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readJson(
  response: Response,
  correlationId: string,
  logFailure: (correlationId: string, reason: string) => void,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    logFailure(correlationId, 'provider_invalid_response');
    throw authUnavailable();
  }
}

function parseSession(
  value: unknown,
  correlationId: string,
  logFailure: (correlationId: string, reason: string) => void,
): SupabaseSession {
  if (typeof value !== 'object' || value === null) {
    logFailure(correlationId, 'provider_invalid_session');
    throw authUnavailable();
  }

  const payload = value as Record<string, unknown>;
  if (
    typeof payload['access_token'] !== 'string' ||
    typeof payload['refresh_token'] !== 'string' ||
    typeof payload['expires_in'] !== 'number' ||
    !Number.isSafeInteger(payload['expires_in']) ||
    payload['expires_in'] <= 0 ||
    payload['token_type'] !== 'bearer'
  ) {
    logFailure(correlationId, 'provider_invalid_session');
    throw authUnavailable();
  }

  return {
    accessToken: payload['access_token'],
    refreshToken: payload['refresh_token'],
    expiresIn: payload['expires_in'],
    tokenType: payload['token_type'],
  };
}

function authenticationFailed(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'AUTHENTICATION_FAILED',
    message: 'Authentication failed',
  });
}

function authUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'AUTHENTICATION_UNAVAILABLE',
    message: 'Authentication is currently unavailable',
  });
}
