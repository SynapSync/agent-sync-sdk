import { describe, it, expect, vi } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { atomicWriteFile } from '../../src/installer/atomic.js';
import { FileWriteError } from '../../src/errors/install.js';
import type { FileSystemAdapter } from '../../src/types/config.js';

/**
 * Create a proxy FS that delegates to a base in-memory FS,
 * with optional method overrides for injecting failures.
 */
function createFailingFs(overrides: Partial<FileSystemAdapter>): {
  base: FileSystemAdapter;
  fs: FileSystemAdapter;
} {
  const base = createMemoryFs();
  const fs: FileSystemAdapter = {
    readFile: (p, e) => base.readFile(p, e),
    writeFile: (p, c, e) => base.writeFile(p, c, e),
    mkdir: (p, o) => base.mkdir(p, o),
    readdir: (p, o) => base.readdir(p, o),
    stat: (p) => base.stat(p),
    lstat: (p) => base.lstat(p),
    symlink: (t, p) => base.symlink(t, p),
    readlink: (p) => base.readlink(p),
    rm: (p, o) => base.rm(p, o),
    rename: (o, n) => base.rename(o, n),
    exists: (p) => base.exists(p),
    copyDirectory: (s, t) => base.copyDirectory(s, t),
    ...overrides,
  };
  return { base, fs };
}

describe('atomicWriteFile()', () => {
  it('writes content to the target path atomically', async () => {
    const fs = createMemoryFs();
    await atomicWriteFile('/output/file.txt', 'hello', fs);

    const content = await fs.readFile('/output/file.txt', 'utf-8');
    expect(content).toBe('hello');
  });

  it('creates parent directories if needed', async () => {
    const fs = createMemoryFs();
    await atomicWriteFile('/deep/nested/dir/file.txt', 'data', fs);

    const exists = await fs.exists('/deep/nested/dir/file.txt');
    expect(exists).toBe(true);
  });

  it('overwrites existing file', async () => {
    const fs = createMemoryFs({ '/out/f.txt': 'old' });
    await atomicWriteFile('/out/f.txt', 'new', fs);

    const content = await fs.readFile('/out/f.txt', 'utf-8');
    expect(content).toBe('new');
  });

  // ---- Error-path tests (Sprint 8 additions) ----

  it('error during write cleans up temp file and throws FileWriteError', async () => {
    const rmSpy =
      vi.fn<(path: string, opts?: { recursive?: boolean; force?: boolean }) => Promise<void>>();
    const { base, fs } = createFailingFs({
      writeFile: vi.fn().mockRejectedValue(new Error('disk full')),
      rm: async (p, o) => {
        rmSpy(p, o);
        return base.rm(p, o);
      },
    });

    await expect(atomicWriteFile('/out/file.txt', 'data', fs)).rejects.toThrow(FileWriteError);

    // Verify cleanup was attempted (rm called with a .tmp path)
    expect(rmSpy).toHaveBeenCalled();
    const tmpPath = rmSpy.mock.calls[0]![0]!;
    expect(tmpPath).toContain('.tmp.');
  });

  it('error during rename cleans up temp file and throws FileWriteError', async () => {
    const rmSpy =
      vi.fn<(path: string, opts?: { recursive?: boolean; force?: boolean }) => Promise<void>>();
    const { base, fs } = createFailingFs({
      rename: vi.fn().mockRejectedValue(new Error('EXDEV')),
      rm: async (p, o) => {
        rmSpy(p, o);
        return base.rm(p, o);
      },
    });

    await expect(atomicWriteFile('/out/file.txt', 'data', fs)).rejects.toThrow(FileWriteError);

    // rm should be called for temp cleanup
    expect(rmSpy).toHaveBeenCalled();
    const tmpPath = rmSpy.mock.calls[0]![0]!;
    expect(tmpPath).toContain('.tmp.');
  });

  it('FileWriteError has cause set to the original error', async () => {
    const originalError = new Error('underlying ENOSPC');
    const { fs } = createFailingFs({
      writeFile: vi.fn().mockRejectedValue(originalError),
    });

    try {
      await atomicWriteFile('/out/file.txt', 'data', fs);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FileWriteError);
      const fwe = e as FileWriteError;
      expect(fwe.cause).toBe(originalError);
      expect(fwe.filePath).toBe('/out/file.txt');
      expect(fwe.code).toBe('FILE_WRITE_ERROR');
    }
  });

  it('cleans up temp file even when rm itself throws', async () => {
    // rm failing should not mask the original FileWriteError
    const { fs } = createFailingFs({
      writeFile: vi.fn().mockRejectedValue(new Error('disk full')),
      rm: vi.fn().mockRejectedValue(new Error('rm also failed')),
    });

    await expect(atomicWriteFile('/out/file.txt', 'data', fs)).rejects.toThrow(FileWriteError);
  });
});
