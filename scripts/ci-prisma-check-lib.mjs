import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');

async function exists(filePath, fileSystem) {
  try {
    await fileSystem.stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function checkPrisma({
  root = process.cwd(),
  fileSystem = { readdir, readFile, stat },
  run = (command, args) => spawnSync(command, args, { cwd: root, stdio: 'inherit' }),
  output = console,
} = {}) {
  const schemaPath = path.join(root, 'prisma', 'schema.prisma');
  if (!(await exists(schemaPath, fileSystem))) {
    output.log('Not applicable until FND-005: prisma/schema.prisma does not exist.');
    return 0;
  }

  const migrationsPath = path.join(root, 'prisma', 'migrations');
  if (!(await exists(migrationsPath, fileSystem))) {
    output.error('Prisma schema exists but prisma/migrations is missing.');
    return 1;
  }

  const entries = await fileSystem.readdir(migrationsPath, { withFileTypes: true });
  const migrations = entries.filter((entry) => entry.isDirectory());
  if (migrations.length === 0) {
    output.error('Prisma schema exists but no migration directory was found.');
    return 1;
  }

  for (const migration of migrations) {
    if (!/^\d{14}_[a-z0-9_]+$/.test(migration.name)) {
      output.error(`Invalid Prisma migration directory name: ${migration.name}.`);
      return 1;
    }
    const sqlPath = path.join(migrationsPath, migration.name, 'migration.sql');
    if (!(await exists(sqlPath, fileSystem)) || (await fileSystem.readFile(sqlPath, 'utf8')).trim().length === 0) {
      output.error(`Invalid Prisma migration ${migration.name}: migration.sql is missing or empty.`);
      return 1;
    }
  }

  const result = run(process.execPath, [prismaCli, 'validate', '--schema', schemaPath]);
  if (result.error || result.status !== 0) {
    output.error(`Prisma validation failed${result.error ? `: ${result.error.message}` : ` with exit code ${result.status}`}.`);
    return 1;
  }

  output.log(`Prisma schema and ${migrations.length} migration directories are valid.`);
  return 0;
}
