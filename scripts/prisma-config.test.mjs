import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');

test('migrate deploy loads the Prisma 7 datasource URL from the root config', () => {
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/vmd_prisma_config_test',
      },
      timeout: 10_000,
    },
  );

  const output = `${result.stdout}\n${result.stderr}`;
  assert.notEqual(result.status, 0, 'the isolated test database must remain unreachable');
  assert.match(output, /Loaded Prisma config from prisma\.config\.ts/);
  assert.match(output, /vmd_prisma_config_test/);
  assert.match(output, /127\.0\.0\.1:1/);
  assert.doesNotMatch(output, /datasource\.url property is required/);
  assert.match(output, /Schema engine error/);
});
