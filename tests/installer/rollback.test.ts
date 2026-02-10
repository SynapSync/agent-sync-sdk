import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { rollback } from '../../src/installer/rollback.js';
import type { InstallAction } from '../../src/installer/rollback.js';

describe('rollback()', () => {
  it('processes actions in LIFO order', async () => {
    const memFs = createMemoryFs({
      '/a/file.txt': 'content-a',
      '/b/file.txt': 'content-b',
    });

    const actions: InstallAction[] = [
      { type: 'write_file', path: '/a/file.txt' },
      { type: 'write_file', path: '/b/file.txt' },
    ];

    const result = await rollback(actions, memFs);

    expect(result.undone).toBe(2);
    expect(result.failed).toBe(0);
    expect(await memFs.exists('/a/file.txt')).toBe(false);
    expect(await memFs.exists('/b/file.txt')).toBe(false);
  });

  it('handles all action types', async () => {
    const memFs = createMemoryFs({
      '/dir/subdir/file.txt': 'some content',
      '/symlink-target': 'target',
      '/copied-file': 'copied',
    });
    await memFs.mkdir('/copied-dir', { recursive: true });

    const actions: InstallAction[] = [
      { type: 'create_directory', path: '/dir' },
      { type: 'write_file', path: '/dir/subdir/file.txt' },
      { type: 'create_symlink', path: '/symlink-target' },
      { type: 'copy_file', path: '/copied-file' },
      { type: 'copy_directory', path: '/copied-dir' },
    ];

    const result = await rollback(actions, memFs);

    expect(result.undone).toBe(5);
    expect(result.failed).toBe(0);
  });

  it('continues on failure and reports counts (best-effort)', async () => {
    const memFs = createMemoryFs();

    // These paths don't exist, but force:true means rm won't throw
    // Let's create a scenario where one actually fails
    const failingFs = {
      ...memFs,
      rm: async (path: string, opts?: { recursive?: boolean; force?: boolean }) => {
        if (path.includes('fail-this')) {
          throw new Error('simulated failure');
        }
        return memFs.rm(path, opts);
      },
    };

    const actions: InstallAction[] = [
      { type: 'write_file', path: '/ok-file' },
      { type: 'write_file', path: '/fail-this-file' },
      { type: 'write_file', path: '/another-ok' },
    ];

    const result = await rollback(actions, failingFs);

    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.undone + result.failed).toBe(3);
  });

  it('restores backup for remove_existing action', async () => {
    const memFs = createMemoryFs({
      '/backup/old-file': 'old content',
    });

    const actions: InstallAction[] = [
      { type: 'remove_existing', path: '/original/old-file', backupPath: '/backup/old-file' },
    ];

    const result = await rollback(actions, memFs);

    expect(result.undone).toBe(1);
    expect(await memFs.readFile('/original/old-file', 'utf-8')).toBe('old content');
  });
});
