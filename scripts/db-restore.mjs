import { restoreDatabase } from './db-backup-restore-lib.mjs';

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error('Usage: node scripts/db-restore.mjs <path-to-dump-file>');
  process.exitCode = 1;
} else {
  try {
    restoreDatabase(dumpPath);
    console.log(`Restored from ${dumpPath}`);
  } catch (error) {
    console.error(`Database restore failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
