import { backupDatabase } from './db-backup-restore-lib.mjs';

try {
  const { path, bytes } = backupDatabase();
  console.log(`Backup written to ${path} (${bytes} bytes)`);
} catch (error) {
  console.error(`Database backup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
