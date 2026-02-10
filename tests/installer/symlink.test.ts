import { describe, it, expect, vi } from 'vitest';
import { resolve, dirname, relative } from 'node:path';
import { createSymlink } from '../../src/installer/symlink.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import type { FileSystemAdapter } from '../../src/types/config.js';

describe('createSymlink()', () => {
  it('returns true when target and linkPath resolve to the same path', async () => {
    const fs = createMemoryFs();
    const result = await createSymlink('/a/b', '/a/b', fs);
    expect(result).toBe(true);
  });

  it('creates a symlink successfully', async () => {
    const fs = createMemoryFs({
      '/canonical/skills/my-skill/SKILL.md': '# Skill',
    });
    const target = '/canonical/skills/my-skill';
    const linkPath = '/agents/claude-code/skills/my-skill';

    const result = await createSymlink(target, linkPath, fs);
    expect(result).toBe(true);

    // Verify the symlink was created
    const exists = await fs.exists(resolve(linkPath));
    expect(exists).toBe(true);

    const linkTarget = await fs.readlink(resolve(linkPath));
    const expected = relative(dirname(resolve(linkPath)), resolve(target));
    expect(linkTarget).toBe(expected);
  });

  it('returns true when symlink already points to correct target', async () => {
    const fs = createMemoryFs();
    const target = '/canonical/skills/my-skill';
    const linkPath = '/agents/skills/my-skill';

    // Create the symlink first
    await createSymlink(target, linkPath, fs);

    // Call again — should detect it already points correctly
    const result = await createSymlink(target, linkPath, fs);
    expect(result).toBe(true);
  });

  it('creates parent directory if missing', async () => {
    const fs = createMemoryFs();
    const target = '/canonical/skill';
    const linkPath = '/deep/nested/agents/skill';

    const result = await createSymlink(target, linkPath, fs);
    expect(result).toBe(true);

    // Verify parent dir was created
    const parentExists = await fs.exists(dirname(resolve(linkPath)));
    expect(parentExists).toBe(true);
  });

  it('returns false when symlink creation fails', async () => {
    const baseFs = createMemoryFs();
    const failingFs: FileSystemAdapter = {
      readFile: (p, e) => baseFs.readFile(p, e),
      writeFile: (p, c, e) => baseFs.writeFile(p, c, e),
      mkdir: (p, o) => baseFs.mkdir(p, o),
      readdir: (p, o) => baseFs.readdir(p, o),
      stat: (p) => baseFs.stat(p),
      lstat: (p) => baseFs.lstat(p),
      symlink: vi.fn().mockRejectedValue(new Error('EPERM')),
      readlink: (p) => baseFs.readlink(p),
      rm: (p, o) => baseFs.rm(p, o),
      rename: (o, n) => baseFs.rename(o, n),
      exists: (p) => baseFs.exists(p),
      copyDirectory: (s, t) => baseFs.copyDirectory(s, t),
    };

    const result = await createSymlink('/target', '/link', failingFs);
    expect(result).toBe(false);
  });

  it('handles ELOOP by force-removing broken link', async () => {
    const baseFs = createMemoryFs();
    const resolvedLink = resolve('/broken-link');

    // Simulate ELOOP: exists() works, but lstat() throws ELOOP on first call
    let lstatCalls = 0;
    const eloopFs: FileSystemAdapter = {
      ...baseFs,
      exists: vi.fn().mockResolvedValue(true),
      lstat: vi.fn().mockImplementation(async () => {
        lstatCalls++;
        const eloopErr = new Error('ELOOP') as Error & { code: string };
        eloopErr.code = 'ELOOP';
        throw eloopErr;
      }),
      rm: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
      symlink: vi.fn().mockResolvedValue(undefined),
      readlink: vi.fn(),
    };

    const result = await createSymlink('/target', '/broken-link', eloopFs);
    expect(result).toBe(true);
    // rm should have been called to clean up the broken link
    expect(eloopFs.rm).toHaveBeenCalled();
    // symlink should have been called to create the new link
    expect(eloopFs.symlink).toHaveBeenCalled();
  });
});
