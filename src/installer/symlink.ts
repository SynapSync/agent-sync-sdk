import { resolve, relative, dirname } from 'node:path';

import type { FileSystemAdapter } from '../types/config.js';

interface NodeError {
  code?: string;
}

function isNodeError(err: unknown): err is NodeError {
  return err instanceof Error && 'code' in err;
}

/**
 * Create a relative symlink from linkPath pointing to target.
 * - Resolves both paths to absolute
 * - Skips if they resolve to the same location
 * - Handles existing entries at linkPath (removes them)
 * - Handles ELOOP by force-removing the broken link
 * - Creates parent directory if needed
 * Returns true on success, false on failure.
 */
export async function createSymlink(
  target: string,
  linkPath: string,
  fs: FileSystemAdapter,
): Promise<boolean> {
  const resolvedTarget = resolve(target);
  const resolvedLink = resolve(linkPath);

  // Skip if source and destination are the same
  if (resolvedTarget === resolvedLink) {
    return true;
  }

  // Check and handle existing entry at link path
  try {
    const exists = await fs.exists(resolvedLink);
    if (exists) {
      // Check if it's already a symlink pointing to the right place
      try {
        const lstat = await fs.lstat(resolvedLink);
        if (lstat.isSymbolicLink()) {
          const existingTarget = await fs.readlink(resolvedLink);
          const resolvedExisting = resolve(dirname(resolvedLink), existingTarget);
          if (resolvedExisting === resolvedTarget) {
            return true; // Already correctly linked
          }
        }
      } catch (err) {
        if (isNodeError(err) && err.code === 'ELOOP') {
          // Broken circular symlink — force remove
          await fs.rm(resolvedLink, { force: true });
        } else {
          throw err;
        }
      }

      // Remove existing entry to replace it
      await fs.rm(resolvedLink, { recursive: true, force: true });
    }
  } catch (err) {
    if (isNodeError(err) && err.code === 'ELOOP') {
      await fs.rm(resolvedLink, { force: true });
    }
    // If exists check fails for other reasons, try to proceed anyway
  }

  // Ensure parent directory exists
  await fs.mkdir(dirname(resolvedLink), { recursive: true });

  // Create relative symlink
  const relativeTarget = relative(dirname(resolvedLink), resolvedTarget);

  try {
    await fs.symlink(relativeTarget, resolvedLink);
    return true;
  } catch {
    return false;
  }
}
