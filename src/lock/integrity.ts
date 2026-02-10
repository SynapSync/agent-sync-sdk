import { createHash } from 'node:crypto';
import type { FileSystemAdapter } from '../types/config.js';

/**
 * Compute a SHA-256 hex digest from a string.
 */
export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Read a file at `path` and verify its SHA-256 hex digest matches `expectedHash`.
 */
export async function verifyContentHash(
  path: string,
  expectedHash: string,
  fs: FileSystemAdapter,
): Promise<boolean> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return computeContentHash(content) === expectedHash;
  } catch {
    return false;
  }
}

/**
 * Compute a combined SHA-256 hex digest for all files inside `dirPath`,
 * sorted by file name for deterministic output.
 */
export async function computeDirectoryHash(
  dirPath: string,
  fs: FileSystemAdapter,
): Promise<string> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();

  const hash = createHash('sha256');

  for (const name of files) {
    const content = await fs.readFile(`${dirPath}/${name}`, 'utf-8');
    hash.update(name, 'utf-8');
    hash.update(content, 'utf-8');
  }

  return hash.digest('hex');
}
