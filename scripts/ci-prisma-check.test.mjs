import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { checkPrisma } from './ci-prisma-check-lib.mjs';

const capture = () => {
  const logs = [];
  const errors = [];
  return { logs, errors, output: { log: (value) => logs.push(value), error: (value) => errors.push(value) } };
};

const temporaryRoot = () => mkdtemp(path.join(os.tmpdir(), 'vmd-prisma-ci-'));

test('reports not applicable before FND-005 when schema is absent', async () => {
  const result = capture();
  assert.equal(await checkPrisma({ root: await temporaryRoot(), output: result.output }), 0);
  assert.match(result.logs[0], /Not applicable until FND-005/);
});

test('fails when Prisma validation fails', async () => {
  const root = await temporaryRoot();
  const migration = path.join(root, 'prisma', 'migrations', '20260809000000_foundation');
  await mkdir(migration, { recursive: true });
  await writeFile(path.join(root, 'prisma', 'schema.prisma'), 'datasource db { provider = "postgresql" }\n');
  await writeFile(path.join(migration, 'migration.sql'), 'SELECT 1;\n');
  const result = capture();
  assert.equal(await checkPrisma({ root, output: result.output, run: () => ({ status: 1 }) }), 1);
  assert.match(result.errors[0], /validation failed/);
});

test('fails for an invalid migration', async () => {
  const root = await temporaryRoot();
  const migration = path.join(root, 'prisma', 'migrations', 'invalid-name');
  await mkdir(migration, { recursive: true });
  await writeFile(path.join(root, 'prisma', 'schema.prisma'), 'datasource db { provider = "postgresql" }\n');
  await writeFile(path.join(migration, 'migration.sql'), 'SELECT 1;\n');
  const result = capture();
  assert.equal(await checkPrisma({ root, output: result.output }), 1);
  assert.match(result.errors[0], /Invalid Prisma migration directory name/);
});

