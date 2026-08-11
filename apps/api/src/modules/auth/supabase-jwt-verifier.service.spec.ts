import { generateKeyPairSync, sign, webcrypto } from 'node:crypto';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service';
import type { AuthConfig } from './auth.config';

const config: AuthConfig = {
  supabaseUrl: 'https://atefkvykvwgtuaiscxnm.supabase.co',
  supabaseAnonKey: 'test-anon-key',
  jwtIssuer: 'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1',
  jwtAudience: 'authenticated',
  jwksUrl: 'https://atefkvykvwgtuaiscxnm.supabase.co/auth/v1/.well-known/jwks.json',
};

const subject = '00000000-0000-4000-8000-000000000001';
const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...signingKeys.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };

describe('SupabaseJwtVerifier', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a signed, unexpired Supabase authenticated access token', async () => {
    mockJwks();
    const verifier = new SupabaseJwtVerifier();

    await expect(verifier.verify(createJwt(), config)).resolves.toMatchObject({ authUserId: subject });
  });

  it('accepts an ES256 token from a JWKS key', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    );
    const ecJwk = {
      ...await webcrypto.subtle.exportKey('jwk', keyPair.publicKey),
      kid: 'ec-key',
      alg: 'ES256',
      use: 'sig',
    };
    jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ keys: [ecJwk] }));
    const verifier = new SupabaseJwtVerifier();
    const token = await createEs256Jwt(keyPair.privateKey);

    await expect(verifier.verify(token, config)).resolves.toMatchObject({ authUserId: subject });
  });

  it.each([
    ['missing', ''],
    ['malformed', 'not-a-jwt'],
    ['expired', createJwt({ exp: Math.floor(Date.now() / 1_000) - 1 })],
    ['wrong issuer', createJwt({ iss: 'https://wrong.example.test/auth/v1' })],
    ['wrong audience', createJwt({ aud: 'wrong-audience' })],
  ])('denies a %s token', async (_name, token) => {
    mockJwks();
    const verifier = new SupabaseJwtVerifier();

    await expect(verifier.verify(token, config)).rejects.toThrow();
  });

  it('denies a token signed by an unknown private key', async () => {
    mockJwks();
    const verifier = new SupabaseJwtVerifier();
    const differentKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

    await expect(verifier.verify(createJwt({}, differentKeys.privateKey), config)).rejects.toThrow('invalid_signature');
  });

  it('fails closed when the JWKS endpoint is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 503 }));
    const verifier = new SupabaseJwtVerifier();

    await expect(verifier.verify(createJwt(), config)).rejects.toThrow('jwks_unavailable');
  });
});

function mockJwks(): void {
  jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ keys: [jwk] }));
}

function createJwt(
  additionalClaims: Record<string, unknown> = {},
  privateKey = signingKeys.privateKey,
): string {
  const header = encode({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
  const payload = encode({
    sub: subject,
    aud: config.jwtAudience,
    iss: config.jwtIssuer,
    exp: Math.floor(Date.now() / 1_000) + 60,
    role: 'authenticated',
    type: 'access_token',
    ...additionalClaims,
  });
  const input = `${header}.${payload}`;
  return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json' },
  });
}

async function createEs256Jwt(
  privateKey: Parameters<typeof webcrypto.subtle.sign>[1],
): Promise<string> {
  const header = encode({ alg: 'ES256', kid: 'ec-key', typ: 'JWT' });
  const payload = encode({
    sub: subject,
    aud: config.jwtAudience,
    iss: config.jwtIssuer,
    exp: Math.floor(Date.now() / 1_000) + 60,
    role: 'authenticated',
  });
  const input = `${header}.${payload}`;
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(input),
  );
  return `${input}.${Buffer.from(signature).toString('base64url')}`;
}
