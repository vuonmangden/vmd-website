import { Injectable } from '@nestjs/common';
import { webcrypto } from 'node:crypto';
import type { AuthConfig } from './auth.config';
import type { VerifiedJwt } from './auth.types';

interface JwtHeader {
  alg: string;
  kid: string;
  typ?: string;
}

interface SigningJwk extends JsonWebKey {
  kid?: string;
  use?: string;
  alg?: string;
}

interface JwksDocument {
  keys: SigningJwk[];
}

export class JwtVerificationError extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

@Injectable()
export class SupabaseJwtVerifier {
  private readonly crypto = globalThis.crypto ?? webcrypto;
  private readonly fetchFn = fetch;
  private readonly now = Date.now;
  private cachedJwks?: { expiresAt: number; keys: Map<string, SigningJwk> };

  async verify(token: string, config: AuthConfig): Promise<VerifiedJwt> {
    const [encodedHeader, encodedPayload, encodedSignature, ...rest] = token.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature || rest.length > 0) {
      throw new JwtVerificationError('malformed_token');
    }

    const header = decodeHeader(encodedHeader);
    const claims = decodeClaims(encodedPayload);
    validateClaims(claims, config, this.now());

    const jwk = await this.getJwk(header, config.jwksUrl);
    const algorithms = verificationAlgorithms(header.alg, jwk);
    const key = await this.crypto.subtle.importKey('jwk', jwk, algorithms.importAlgorithm, false, ['verify']);
    const valid = await this.crypto.subtle.verify(
      algorithms.verifyAlgorithm,
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );

    if (!valid) {
      throw new JwtVerificationError('invalid_signature');
    }

    return { authUserId: claims['sub'] as string, claims };
  }

  private async getJwk(header: JwtHeader, jwksUrl: string): Promise<SigningJwk> {
    let jwk = (await this.getJwks(jwksUrl, false)).get(header.kid);
    if (!jwk) {
      jwk = (await this.getJwks(jwksUrl, true)).get(header.kid);
    }

    if (!jwk || (jwk.use !== undefined && jwk.use !== 'sig') || (jwk.alg !== undefined && jwk.alg !== header.alg)) {
      throw new JwtVerificationError('unknown_signing_key');
    }

    return jwk;
  }

  private async getJwks(jwksUrl: string, forceRefresh: boolean): Promise<Map<string, SigningJwk>> {
    if (!forceRefresh && this.cachedJwks && this.cachedJwks.expiresAt > this.now()) {
      return this.cachedJwks.keys;
    }

    let response: Response;
    try {
      response = await this.fetchFn(jwksUrl, { signal: AbortSignal.timeout(5_000) });
    } catch {
      throw new JwtVerificationError('jwks_unavailable');
    }

    if (!response.ok) {
      throw new JwtVerificationError('jwks_unavailable');
    }

    let document: unknown;
    try {
      document = await response.json();
    } catch {
      throw new JwtVerificationError('jwks_invalid_response');
    }

    if (!isJwksDocument(document)) {
      throw new JwtVerificationError('jwks_invalid_response');
    }

    const keys = new Map<string, SigningJwk>();
    for (const key of document.keys) {
      if (typeof key.kid === 'string' && key.kid.length > 0) {
        keys.set(key.kid, key);
      }
    }

    if (keys.size === 0) {
      throw new JwtVerificationError('jwks_invalid_response');
    }

    this.cachedJwks = { keys, expiresAt: this.now() + 5 * 60 * 1_000 };
    return keys;
  }
}

function decodeHeader(segment: string): JwtHeader {
  const value = decodeJson(segment);
  if (
    typeof value['alg'] !== 'string' ||
    typeof value['kid'] !== 'string' ||
    (value['typ'] !== undefined && value['typ'] !== 'JWT')
  ) {
    throw new JwtVerificationError('invalid_header');
  }

  return { alg: value['alg'], kid: value['kid'], ...(typeof value['typ'] === 'string' ? { typ: value['typ'] } : {}) };
}

function decodeClaims(segment: string): Record<string, unknown> {
  const value = decodeJson(segment);
  if (!isUuid(value['sub'])) {
    throw new JwtVerificationError('invalid_subject');
  }

  return value;
}

function decodeJson(segment: string): Record<string, unknown> {
  try {
    const decoded = JSON.parse(Buffer.from(decodeBase64Url(segment)).toString('utf8')) as unknown;
    if (!isRecord(decoded)) throw new Error('not an object');
    return decoded;
  } catch {
    throw new JwtVerificationError('malformed_token');
  }
}

function decodeBase64Url(segment: string): ArrayBuffer {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) {
    throw new JwtVerificationError('malformed_token');
  }

  const decoded = Buffer.from(segment, 'base64url');
  const result = new Uint8Array(decoded.byteLength);
  result.set(decoded);
  return result.buffer;
}

function validateClaims(claims: Record<string, unknown>, config: AuthConfig, now: number): void {
  if (claims['iss'] !== config.jwtIssuer || !hasAudience(claims['aud'], config.jwtAudience)) {
    throw new JwtVerificationError('invalid_issuer_or_audience');
  }

  if (typeof claims['exp'] !== 'number' || !Number.isFinite(claims['exp']) || claims['exp'] * 1_000 <= now) {
    throw new JwtVerificationError('expired_token');
  }

  if (typeof claims['nbf'] === 'number' && claims['nbf'] * 1_000 > now) {
    throw new JwtVerificationError('not_yet_valid');
  }

  if (claims['role'] !== 'authenticated') {
    throw new JwtVerificationError('invalid_token_role');
  }

  if (claims['type'] !== undefined && claims['type'] !== 'access' && claims['type'] !== 'access_token') {
    throw new JwtVerificationError('invalid_token_type');
  }
}

function verificationAlgorithms(
  alg: string,
  jwk: SigningJwk,
): { importAlgorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams; verifyAlgorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams } {
  const rsaHashes: Record<string, string> = {
    RS256: 'SHA-256',
    RS384: 'SHA-384',
    RS512: 'SHA-512',
  };
  const ecdsaCurves: Record<string, { namedCurve: string; hash: string }> = {
    ES256: { namedCurve: 'P-256', hash: 'SHA-256' },
    ES384: { namedCurve: 'P-384', hash: 'SHA-384' },
    ES512: { namedCurve: 'P-521', hash: 'SHA-512' },
  };

  const rsaHash = rsaHashes[alg];
  if (rsaHash && jwk.kty === 'RSA') {
    return {
      importAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: rsaHash },
      verifyAlgorithm: { name: 'RSASSA-PKCS1-v1_5' },
    };
  }

  const ecdsa = ecdsaCurves[alg];
  if (ecdsa && jwk.kty === 'EC' && jwk.crv === ecdsa.namedCurve) {
    return {
      importAlgorithm: { name: 'ECDSA', namedCurve: ecdsa.namedCurve },
      verifyAlgorithm: { name: 'ECDSA', hash: ecdsa.hash },
    };
  }

  throw new JwtVerificationError('unsupported_signing_algorithm');
}

function hasAudience(value: unknown, expected: string): boolean {
  return value === expected || (Array.isArray(value) && value.includes(expected));
}

function isJwksDocument(value: unknown): value is JwksDocument {
  return isRecord(value) && Array.isArray(value['keys']);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
