import { runInfrastructure } from './infra-runner.mjs';

const action = process.argv[2];

try {
  if (!runInfrastructure(action)) process.exitCode = process.exitCode || 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
