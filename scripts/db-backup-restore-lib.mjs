import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectEnvFile, parseEnv } from './infra-runner.mjs';

const COMPOSE_FILE = 'infrastructure/docker/compose.yaml';

/** `YYYY-MM-DDTHH-mm-ss-sssZ`-based filename — sortable, filesystem-safe on Windows (no `:`). */
export function backupFilename(now = new Date()) {
  return `vmd-backup-${now.toISOString().replaceAll(/[:.]/g, '-')}.dump`;
}

function composeArgs(envFile) {
  return ['compose', '--env-file', envFile, '-f', COMPOSE_FILE];
}

function loadEnv(options) {
  const envFile = options.envFile ?? selectEnvFile(options.exists);
  const read = options.read ?? ((file) => readFileSync(file, 'utf8'));
  return { envFile, values: parseEnv(read(envFile)) };
}

/**
 * Dumps the Postgres database running in the local Docker Compose stack via
 * `docker compose exec postgres pg_dump` (the `postgres:16-alpine` image
 * already bundles `pg_dump`/`pg_restore` — no host Postgres client tools
 * required). Custom format (`-F c`): compressed, and restorable selectively,
 * unlike a plain SQL dump.
 */
export function backupDatabase(options = {}) {
  const { envFile, values } = loadEnv(options);
  const spawn = options.spawn ?? spawnSync;
  const mkdir = options.mkdir ?? mkdirSync;
  const write = options.write ?? writeFileSync;
  const outDir = options.outDir ?? 'backups';
  const filename = options.filename ?? backupFilename(options.now?.() ?? new Date());
  const outPath = join(outDir, filename);

  mkdir(outDir, { recursive: true });

  const result = spawn(
    'docker',
    [...composeArgs(envFile), 'exec', '-T', 'postgres', 'pg_dump', '-U', values.POSTGRES_USER, '-d', values.POSTGRES_DB, '-F', 'c'],
    { env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`pg_dump exited with code ${result.status}: ${result.stderr?.toString() ?? ''}`);

  write(outPath, result.stdout);
  return { path: outPath, bytes: result.stdout.length };
}

/**
 * Restores a `pg_dump -F c` file via `pg_restore`, into the same Compose
 * Postgres. `--clean --if-exists` drops existing objects first, so restoring
 * onto a non-empty database (the realistic DR scenario, not just an
 * empty-database rehearsal) is safe to run without a manual drop step.
 * `--no-owner` avoids failing on role names that may not exist in the
 * target environment.
 */
export function restoreDatabase(dumpPath, options = {}) {
  const { envFile, values } = loadEnv(options);
  const spawn = options.spawn ?? spawnSync;
  const readFile = options.readFile ?? readFileSync;

  const dumpBuffer = readFile(dumpPath);
  const result = spawn(
    'docker',
    [...composeArgs(envFile), 'exec', '-T', 'postgres', 'pg_restore', '-U', values.POSTGRES_USER, '-d', values.POSTGRES_DB, '--clean', '--if-exists', '--no-owner'],
    { input: dumpBuffer, env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`pg_restore exited with code ${result.status}: ${result.stderr?.toString() ?? ''}`);
  return { restored: true };
}
