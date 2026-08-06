import assert from 'node:assert/strict';
import test from 'node:test';
import { parseEnv, selectEnvFile, validateEnvironment } from './infra-runner.mjs';

test('selects .env when it exists', () => {
  assert.equal(selectEnvFile((file) => file === '.env'), '.env');
});

test('falls back to .env.example when .env does not exist', () => {
  assert.equal(selectEnvFile(() => false), '.env.example');
});

test('accepts matching PostgreSQL ports', () => {
  assert.doesNotThrow(() => validateEnvironment(parseEnv('POSTGRES_PORT=55432\nDATABASE_URL=postgresql://local:local@127.0.0.1:55432/vmd')));
});

test('rejects a DATABASE_URL port that differs from POSTGRES_PORT', () => {
  assert.throws(
    () => validateEnvironment(parseEnv('POSTGRES_PORT=55432\nDATABASE_URL=postgresql://local:local@127.0.0.1:5432/vmd')),
    /must match POSTGRES_PORT/,
  );
});
