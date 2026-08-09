import { checkPrisma } from './ci-prisma-check-lib.mjs';

try {
  process.exitCode = await checkPrisma();
} catch (error) {
  console.error(`Prisma CI check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

