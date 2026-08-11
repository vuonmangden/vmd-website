import type { Request } from 'express';

export interface AuthenticatedActor {
  staffProfileId: string;
  authUserId: string;
  fullName: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  actor?: AuthenticatedActor;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthSessionResponse {
  session: SupabaseSession;
  actor: AuthenticatedActor;
}

export interface VerifiedJwt {
  authUserId: string;
  claims: Record<string, unknown>;
}
