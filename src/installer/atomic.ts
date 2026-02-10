import { dirname, join } from 'node:path';

import type { FileSystemAdapter } from '../types/config.js';
import { FileWriteError } from '../errors/install.js';

let atomicCounter = 0;

/**
 * Write a file atomically: write to a temp file, then rename to the target.
 * Cleans up the temp file on failure.
 */
export async function atomicWriteFile(
  targetPath: string,
  content: string,
  fs: FileSystemAdapter,
): Promise<void> {
  const dir = dirname(targetPath);
  const tmpPath = join(dir, `.tmp.${process.pid}.${Date.now()}.${atomicCounter++}`);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, targetPath);
  } catch (err) {
    // Best-effort cleanup of the temp file
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      // ignore cleanup errors
    }
    throw new FileWriteError(targetPath, { cause: err });
  }
}
