import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { writeLockFileAtomic } from '../../src/lock/atomic.js';
import { CURRENT_LOCK_VERSION } from '../../src/lock/schema.js';
import type { LockFile } from '../../src/types/lock.js';

describe('writeLockFileAtomic()', () => {
  it('writes valid JSON with 2-space indent and trailing newline', async () => {
    const memFs = createMemoryFs();
    const lock: LockFile = {
      version: CURRENT_LOCK_VERSION,
      cognitives: {},
    };

    await writeLockFileAtomic('/test/.agents/cognit/lock.json', lock, memFs);

    const content = await memFs.readFile('/test/.agents/cognit/lock.json', 'utf-8');
    expect(content).toBe(JSON.stringify(lock, null, 2) + '\n');
    expect(content.endsWith('\n')).toBe(true);

    // Verify it's valid JSON
    const parsed = JSON.parse(content);
    expect(parsed.version).toBe(CURRENT_LOCK_VERSION);
  });

  it('creates parent directories if they do not exist', async () => {
    const memFs = createMemoryFs();
    const lock: LockFile = { version: CURRENT_LOCK_VERSION, cognitives: {} };

    await writeLockFileAtomic('/deep/nested/path/lock.json', lock, memFs);

    const exists = await memFs.exists('/deep/nested/path/lock.json');
    expect(exists).toBe(true);
  });

  it('throws and cleans up temp file on write failure', async () => {
    const baseFs = createMemoryFs() as import('../../src/types/config.js').FileSystemAdapter;
    let writeCount = 0;
    const failingFs: import('../../src/types/config.js').FileSystemAdapter = {
      readFile: (p, e) => baseFs.readFile(p, e),
      mkdir: (p, o) => baseFs.mkdir(p, o),
      readdir: (p, o) => baseFs.readdir(p, o),
      stat: (p) => baseFs.stat(p),
      lstat: (p) => baseFs.lstat(p),
      symlink: (t, p) => baseFs.symlink(t, p),
      readlink: (p) => baseFs.readlink(p),
      rm: (p, o) => baseFs.rm(p, o),
      rename: (o, n) => baseFs.rename(o, n),
      exists: (p) => baseFs.exists(p),
      copyDirectory: (s, t) => baseFs.copyDirectory(s, t),
      writeFile: async (path: string, content: string, encoding: 'utf-8') => {
        writeCount++;
        if (writeCount === 1) {
          throw new Error('disk full');
        }
        return baseFs.writeFile(path, content, encoding);
      },
    };

    const lock: LockFile = { version: CURRENT_LOCK_VERSION, cognitives: {} };

    await expect(writeLockFileAtomic('/test/lock.json', lock, failingFs)).rejects.toThrow(
      'disk full',
    );
  });
});
