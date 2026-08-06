import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export function selectEnvFile(exists = existsSync) {
  return exists('.env') ? '.env' : '.env.example';
}

export function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

export function validateEnvironment(values) {
  const postgresPort = values.POSTGRES_PORT ?? '5432';
  const databaseUrl = new URL(values.DATABASE_URL);
  const urlPort = databaseUrl.port || '5432';
  if (urlPort !== postgresPort) {
    throw new Error(`DATABASE_URL port (${urlPort}) must match POSTGRES_PORT (${postgresPort})`);
  }
}

function execute(command, args, environment, spawn = spawnSync) {
  const result = spawn(command, args, { env: environment, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status === 0;
}

export function runInfrastructure(action, options = {}) {
  const envFile = options.envFile ?? selectEnvFile(options.exists);
  const read = options.read ?? ((file) => readFileSync(file, 'utf8'));
  validateEnvironment(parseEnv(read(envFile)));

  const environment = { ...process.env, VMD_INFRA_ENV_FILE: envFile };
  const compose = ['compose', '--env-file', envFile, '-f', 'infrastructure/docker/compose.yaml'];
  const run = (args) => execute('docker', [...compose, ...args], environment, options.spawn);

  if (action === 'up') {
    const services = ['postgres', 'redis', 'mailpit', 'minio', 'mock-sepay', 'mock-zalo'];
    return run(['up', '--detach', '--build', '--wait', ...services]) && run(['run', '--rm', 'minio-init']);
  }
  if (action === 'down') return run(['down']);
  if (action === 'status') return run(['ps']);
  if (action === 'logs') return run(['logs', '--follow', '--tail', '200']);
  if (action === 'check') {
    return execute(process.execPath, [`--env-file=${envFile}`, 'scripts/infra-check.mjs'], environment, options.spawn);
  }
  throw new Error(`Unknown infrastructure action: ${action}`);
}
