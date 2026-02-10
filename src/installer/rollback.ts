import type { FileSystemAdapter } from '../types/config.js';

export type InstallAction =
  | { type: 'create_directory'; path: string }
  | { type: 'write_file'; path: string }
  | { type: 'create_symlink'; path: string }
  | { type: 'copy_file'; path: string }
  | { type: 'copy_directory'; path: string }
  | { type: 'remove_existing'; path: string; backupPath?: string };

export interface RollbackResult {
  readonly undone: number;
  readonly failed: number;
}

/**
 * Reverse install actions in LIFO order (best-effort).
 * Returns count of successfully undone and failed rollback steps.
 */
export async function rollback(
  actions: readonly InstallAction[],
  fs: FileSystemAdapter,
): Promise<RollbackResult> {
  let undone = 0;
  let failed = 0;

  // Process in reverse (LIFO) order
  for (let i = actions.length - 1; i >= 0; i--) {
    const action = actions[i];
    if (!action) continue;

    try {
      switch (action.type) {
        case 'create_directory':
          await fs.rm(action.path, { recursive: true, force: true });
          break;

        case 'write_file':
        case 'copy_file':
          await fs.rm(action.path, { force: true });
          break;

        case 'create_symlink':
          await fs.rm(action.path, { force: true });
          break;

        case 'copy_directory':
          await fs.rm(action.path, { recursive: true, force: true });
          break;

        case 'remove_existing':
          // Restore from backup if available
          if (action.backupPath) {
            await fs.rename(action.backupPath, action.path);
          }
          break;
      }
      undone++;
    } catch {
      failed++;
    }
  }

  return { undone, failed };
}
