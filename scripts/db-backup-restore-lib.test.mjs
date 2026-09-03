import assert from 'node:assert/strict';
import test from 'node:test';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';
import { backupDatabase, backupFilename, restoreDatabase } from './db-backup-restore-lib.mjs';

const ENV_CONTENT = 'POSTGRES_USER=vmd_local\nPOSTGRES_DB=vmd_local\nDATABASE_URL=postgresql://vmd_local:pw@127.0.0.1:5432/vmd_local\n';

function fakeIo(overrides = {}) {
  return {
    exists: () => false,
    read: () => ENV_CONTENT,
    ...overrides,
  };
}

test('backupFilename produces a sortable, filesystem-safe (no colon) name', () => {
  const name = backupFilename(new Date('2026-09-03T04:05:06.789Z'));
  assert.equal(name, 'vmd-backup-2026-09-03T04-05-06-789Z.dump');
});

test('backupDatabase pipes pg_dump through docker compose exec against the configured user/db, and writes the result', () => {
  const calls = [];
  const written = [];
  const stdout = Buffer.from('fake-dump-bytes');
  const spawn = (command, args, opts) => {
    calls.push({ command, args, opts });
    return { status: 0, stdout, stderr: Buffer.from('') };
  };
  const mkdir = () => {};
  const write = (path, data) => written.push({ path, data });

  const result = backupDatabase({ ...fakeIo(), spawn, mkdir, write, outDir: 'backups', filename: 'test.dump' });

  assert.equal(result.path, join('backups', 'test.dump'));
  assert.equal(result.bytes, stdout.length);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'docker');
  assert.ok(calls[0].args.includes('pg_dump'));
  assert.ok(calls[0].args.includes('vmd_local'));
  assert.equal(written[0].data, stdout);
});

test('backupDatabase throws with pg_dump stderr when the command fails', () => {
  const spawn = () => ({ status: 1, stdout: Buffer.alloc(0), stderr: Buffer.from('connection refused') });
  assert.throws(
    () => backupDatabase({ ...fakeIo(), spawn, mkdir: () => {}, write: () => {}, filename: 'x.dump' }),
    /pg_dump exited with code 1.*connection refused/s,
  );
});

test('restoreDatabase pipes the dump file into pg_restore with --clean --if-exists', () => {
  const calls = [];
  const dumpBuffer = Buffer.from('fake-dump-bytes');
  const spawn = (command, args, opts) => {
    calls.push({ command, args, opts });
    return { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.from('') };
  };
  const readFile = () => dumpBuffer;

  const result = restoreDatabase('backups/test.dump', { ...fakeIo(), spawn, readFile });

  assert.deepEqual(result, { restored: true });
  assert.equal(calls[0].command, 'docker');
  assert.ok(calls[0].args.includes('pg_restore'));
  assert.ok(calls[0].args.includes('--clean'));
  assert.ok(calls[0].args.includes('--if-exists'));
  assert.equal(calls[0].opts.input, dumpBuffer);
});

test('restoreDatabase throws with pg_restore stderr when the command fails', () => {
  const spawn = () => ({ status: 1, stdout: Buffer.alloc(0), stderr: Buffer.from('no such database') });
  assert.throws(
    () => restoreDatabase('backups/missing.dump', { ...fakeIo(), spawn, readFile: () => Buffer.alloc(0) }),
    /pg_restore exited with code 1.*no such database/s,
  );
});
