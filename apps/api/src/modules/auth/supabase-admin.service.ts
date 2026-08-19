import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface InvitedSupabaseUser {
  id: string;
}

/**
 * Thin wrapper around Supabase's GoTrue admin invite endpoint using the
 * platform's built-in fetch. The @supabase/supabase-js SDK could not be
 * installed in this environment — the repo's preinstall script hard-requires
 * Node 24, which this toolchain does not have — and a single REST call does
 * not warrant the dependency-audit surface of the full client library.
 *
 * Fails closed in production (same posture as AuthConfigService, per
 * MNT-010: production auth stays hard-disabled until REL-001) and whenever
 * SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
@Injectable()
export class SupabaseAdminService {
  async inviteUserByEmail(email: string): Promise<InvitedSupabaseUser> {
    const environment = process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development';
    if (environment === 'production') throw unavailable();

    const supabaseUrl = requireHttpsUrl('SUPABASE_URL');
    const serviceRoleKey = requireValue('SUPABASE_SERVICE_ROLE_KEY');

    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ email }),
      });
    } catch {
      throw inviteFailed();
    }

    if (!response.ok) throw inviteFailed();

    const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
    if (!body || typeof body.id !== 'string' || !body.id) throw inviteFailed();

    return { id: body.id };
  }
}

function requireValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw unavailable();
  return value;
}

function requireHttpsUrl(name: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) throw unavailable();
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error('invalid URL');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw unavailable();
  }
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException({
    code: 'STAFF_INVITE_CONFIGURATION_UNAVAILABLE',
    message: 'Staff invite is currently unavailable',
  });
}

function inviteFailed(): ServiceUnavailableException {
  return new ServiceUnavailableException({ code: 'STAFF_INVITE_FAILED', message: 'Could not send staff invite' });
}
