import { join } from 'node:path';

import type { FileSystemAdapter } from '../types/config.js';

const EXCLUDED_FILES = new Set(['README.md', 'metadata.json']);

/**
 * Check whether a file/directory should be excluded from copying.
 * Excludes: names starting with '_', '.git' directories, README.md, metadata.json
 */
export function isExcluded(name: string, isDir: boolean): boolean {
  if (name.startsWith('_')) return true;
  if (isDir && name === '.git') return true;
  if (!isDir && EXCLUDED_FILES.has(name)) return true;
  return false;
}

/**
 * Recursively deep-copy a directory tree, skipping excluded entries.
 * Uses Promise.all for parallel copying within each directory level.
 */
export async function deepCopy(
  src: string,
  dest: string,
  fs: FileSystemAdapter,
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const isDir = entry.isDirectory();
      if (isExcluded(entry.name, isDir)) return;

      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (isDir) {
        await deepCopy(srcPath, destPath, fs);
      } else {
        const content = await fs.readFile(srcPath, 'utf-8');
        await fs.writeFile(destPath, content, 'utf-8');
      }
    }),
  );
}
