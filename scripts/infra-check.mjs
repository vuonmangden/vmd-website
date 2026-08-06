import { execFileSync } from 'node:child_process';
import net from 'node:net';
import { runChecks } from './infra-check-lib.mjs';

const envFile = process.env.VMD_INFRA_ENV_FILE ?? '.env.example';
const composeArgs = ['compose', '--env-file', envFile, '-f', 'infrastructure/docker/compose.yaml'];

function envNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`${name} must be a valid TCP port`);
  return value;
}

function runDocker(args) {
  return execFileSync('docker', [...composeArgs, ...args], { encoding: 'utf8' }).trim();
}

async function fetchJson(url, options, expectedStatus) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  if (response.status !== expectedStatus) throw new Error(`expected HTTP ${expectedStatus}, received ${response.status}`);
  return body;
}

function checkSmtp(port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const timer = setTimeout(() => socket.destroy(new Error('SMTP banner timeout')), 5000);
    socket.once('data', (data) => {
      const banner = data.toString('utf8').trim();
      clearTimeout(timer);
      socket.end();
      if (!banner.startsWith('220')) reject(new Error(`unexpected SMTP banner: ${banner}`));
      else resolve(banner);
    });
    socket.once('error', reject);
  });
}

const definitions = [
  ['Compose services healthy', () => {
    const services = runDocker(['ps', '--format', 'json']).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
    const required = ['postgres', 'redis', 'mailpit', 'minio', 'mock-sepay', 'mock-zalo'];
    for (const service of required) {
      const entry = services.find((item) => item.Service === service);
      if (!entry || entry.Health !== 'healthy') throw new Error(`${service} is not healthy`);
    }
    return `${required.length} long-running services healthy`;
  }],
  ['PostgreSQL', () => {
    const result = runDocker(['exec', '-T', 'postgres', 'psql', '-U', process.env.POSTGRES_USER, '-d', process.env.POSTGRES_DB, '-tAc', 'SELECT 1']);
    if (result !== '1') throw new Error(`unexpected query result: ${result}`);
    return 'SELECT 1 returned 1';
  }],
  ['Redis', () => {
    const result = runDocker(['exec', '-T', 'redis', 'redis-cli', 'ping']);
    if (result !== 'PONG') throw new Error(`unexpected ping result: ${result}`);
    return 'PING returned PONG';
  }],
  ['Mailpit SMTP', () => checkSmtp(envNumber('MAILPIT_SMTP_PORT', 1025))],
  ['Mailpit Web UI', async () => {
    const response = await fetch(`http://127.0.0.1:${envNumber('MAILPIT_UI_PORT', 8025)}/livez`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return `HTTP ${response.status}`;
  }],
  ['MinIO API', async () => {
    const response = await fetch(`http://127.0.0.1:${envNumber('MINIO_API_PORT', 9000)}/minio/health/live`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return `HTTP ${response.status}`;
  }],
  ['MinIO Console', async () => {
    const response = await fetch(`http://127.0.0.1:${envNumber('MINIO_CONSOLE_PORT', 9001)}/`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
    if (response.status < 200 || response.status >= 400) throw new Error(`HTTP ${response.status}`);
    return `HTTP ${response.status}`;
  }],
  ['MinIO bucket and persistence marker', () => {
    const result = runDocker(['run', '--rm', 'minio-check']);
    if (!result.includes('vmd-local-infrastructure-marker-v1')) throw new Error('infrastructure marker content is missing');
    return 'bucket and marker exist (read-only check)';
  }],
];

for (const [name, port, expectedProvider] of [
  ['Mock SePay', envNumber('MOCK_SEPAY_PORT', 4010), 'sepay-local-mock'],
  ['Mock Zalo', envNumber('MOCK_ZALO_PORT', 4011), 'zalo-local-mock'],
]) {
  definitions.push(
    [`${name} health`, async () => {
      const body = await fetchJson(`http://127.0.0.1:${port}/health`, {}, 200);
      if (body.provider !== expectedProvider || body.status !== 'ok') throw new Error('unexpected health body');
      return 'deterministic health response';
    }],
    [`${name} success`, async () => {
      const body = await fetchJson(`http://127.0.0.1:${port}/success`, { method: 'POST' }, 200);
      if (body.provider !== expectedProvider || body.status !== 'success') throw new Error('unexpected success body');
      return 'HTTP 200 deterministic response';
    }],
    [`${name} error`, async () => {
      const body = await fetchJson(`http://127.0.0.1:${port}/error`, { method: 'POST' }, 422);
      if (body.provider !== expectedProvider || body.status !== 'error') throw new Error('unexpected error body');
      return 'HTTP 422 deterministic response';
    }],
  );
}

process.exitCode = await runChecks(definitions);
