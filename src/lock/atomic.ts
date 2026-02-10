import { dirname, join } from 'node:path';
import type { FileSystemAdapter } from '../types/config.js';
import type { LockFile } from '../types/lock.js';

/**
 * Atomically write a lock file: write to a temp file then rename.
 * Ensures the parent directory exists before writing.
 * Cleans up the temp file on failure.
 */
export async function writeLockFileAtomic(
  lockPath: string,
  lock: LockFile,
  fs: FileSystemAdapter,
): Promise<void> {
  const dir = dirname(lockPath);
  const tmpPath = join(dir, `.tmp.${process.pid}`);

  await fs.mkdir(dir, { recursive: true });

  try {
    const content = JSON.stringify(lock, null, 2) + '\n';
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, lockPath);
  } catch (error) {
    // Best-effort cleanup of the temp file
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      // ignore cleanup errors
    }
    throw error;
  }
}
