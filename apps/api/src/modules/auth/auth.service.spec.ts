import type { Request } from 'express';
import { AuthService, enforceMfaPolicy } from './auth.service';
import type { AuthConfigService } from './auth.config';
import type { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import type { PrismaService } from '../../prisma/prisma.service';

const authUserId = '00000000-0000-4000-8000-000000000001';

describe('AuthService actor context', () => {
  let service: AuthService;
  let prisma: { staffProfile: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtVerifier: { verify: jest.Mock };

  beforeEach(() => {
    prisma = { staffProfile: { findUnique: jest.fn(), update: jest.fn() } };
    jwtVerifier = { verify: jest.fn().mockResolvedValue({ authUserId, claims: {} }) };
    service = createService(prisma, jwtVerifier);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('attaches a trusted actor from an ACTIVE staff profile, not frontend-supplied identity', async () => {
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile());
    const request = requestWithBearer();

    await expect(service.getActorForRequest(request, 'correlation-id')).resolves.toEqual({
      staffProfileId: '64d51c11-8e51-47c4-aedc-4c4e1895ab6d',
      authUserId,
      fullName: 'Nhân viên thử nghiệm',
      email: 'staff@example.test',
      roles: ['RECEPTION'],
      permissions: ['booking.read'],
    });
    expect((request as Request & { actor?: unknown }).actor).toBeDefined();
    expect(prisma.staffProfile.findUnique).toHaveBeenCalledWith({
      where: { authUserId },
      select: {
        id: true, authUserId: true, fullName: true, email: true, status: true,
        roleAssignments: {
          select: {
            role: {
              select: {
                code: true, isSystem: true,
                permissions: { select: { permission: { select: { code: true } } } },
              },
            },
          },
        },
      },
    });
  });

  it('denies an ACTIVE profile without an approved role', async () => {
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile('ACTIVE', []));
    await expect(service.getActorForRequest(requestWithBearer(), 'correlation-id')).rejects.toMatchObject({ status: 401 });
  });

  it('unions and sorts trusted permissions from multiple database roles', async () => {
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile('ACTIVE', [
      roleAssignment('MARKETING', ['report.read', 'content.manage']),
      roleAssignment('ACCOUNTANT', ['payment.read', 'report.read']),
    ]));
    await expect(service.getActorForRequest(requestWithBearer(), 'correlation-id')).resolves.toMatchObject({
      roles: ['ACCOUNTANT', 'MARKETING'],
      permissions: ['content.manage', 'payment.read', 'report.read'],
    });
  });

  it('fails closed for privileged MFA enforcement without aal2', () => {
    expect(() => enforceMfaPolicy(['MANAGER'], { aal: 'aal1' }, 'staging', true)).toThrow();
    expect(() => enforceMfaPolicy(['MANAGER'], { aal: 'aal2' }, 'staging', true)).not.toThrow();
    expect(() => enforceMfaPolicy(['RECEPTION'], { aal: 'aal1' }, 'production')).not.toThrow();
  });

  it('denies a verified token when no application staff profile exists', async () => {
    prisma.staffProfile.findUnique.mockResolvedValue(null);

    await expect(service.getActorForRequest(requestWithBearer(), 'correlation-id')).rejects.toMatchObject({ status: 401 });
  });

  it.each(['INVITED', 'SUSPENDED'])('denies a verified token for a %s staff profile', async (status) => {
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile(status));

    await expect(service.getActorForRequest(requestWithBearer(), 'correlation-id')).rejects.toMatchObject({ status: 401 });
  });

  it('uses Supabase password login, validates the returned token, and records an ACTIVE staff login', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({
      access_token: 'access.header.signature',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
    }));
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile());
    prisma.staffProfile.update.mockResolvedValue({});
    service = createService(prisma, jwtVerifier);

    await expect(service.login('staff@example.test', 'not-a-real-password', 'correlation-id')).resolves.toMatchObject({
      session: { accessToken: 'access.header.signature', refreshToken: 'refresh-token' },
      actor: { authUserId },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1/token?grant_type=password',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(prisma.staffProfile.update).toHaveBeenCalledWith({
      where: { authUserId },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it('requests a rotated refresh session and revokes a verified logout session', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({
        access_token: 'rotated.access.token',
        refresh_token: 'rotated-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    prisma.staffProfile.findUnique.mockResolvedValue(activeProfile());
    prisma.staffProfile.update.mockResolvedValue({});
    service = createService(prisma, jwtVerifier);

    await expect(service.refresh('old-refresh-token', 'correlation-id')).resolves.toMatchObject({
      session: { refreshToken: 'rotated-refresh-token' },
    });
    await expect(service.logout('Bearer test.header.signature', 'correlation-id')).resolves.toEqual({ revoked: true });

    expect(fetchMock.mock.calls[0]?.[0]).toContain('grant_type=refresh_token');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/auth/v1/logout');
  });
});

function requestWithBearer(): Request {
  return { headers: { authorization: 'Bearer test.header.signature' } } as Request;
}

function activeProfile(status = 'ACTIVE', roleAssignments = [roleAssignment('RECEPTION', ['booking.read'])]) {
  return {
    id: '64d51c11-8e51-47c4-aedc-4c4e1895ab6d',
    authUserId,
    fullName: 'Nhân viên thử nghiệm',
    email: 'staff@example.test',
    status,
    roleAssignments,
  };
}

function roleAssignment(code: string, permissions: string[]) {
  return {
    role: {
      code,
      isSystem: true,
      permissions: permissions.map((permissionCode) => ({ permission: { code: permissionCode } })),
    },
  };
}

function createService(
  prisma: { staffProfile: { findUnique: jest.Mock; update: jest.Mock } },
  jwtVerifier: { verify: jest.Mock },
): AuthService {
  const config = {
    get: jest.fn().mockReturnValue({
      supabaseUrl: 'https://atefkvykvwgtuaiscxnm.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      jwtIssuer: 'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1',
      jwtAudience: 'authenticated',
      jwksUrl: 'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1/.well-known/jwks.json',
    }),
  };
  return new AuthService(
    prisma as unknown as PrismaService,
    config as unknown as AuthConfigService,
    jwtVerifier as unknown as SupabaseJwtVerifier,
  );
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  });
}
