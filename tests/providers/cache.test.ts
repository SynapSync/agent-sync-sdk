import { describe, it, expect, vi } from 'vitest';
import { InMemoryFileSystem } from '../../src/fs/memory.js';
import { CloneCache } from '../../src/providers/cache.js';
import type { GitClient } from '../../src/types/source.js';

let cloneCounter = 0;

function createMockGitClient(fs: InMemoryFileSystem): GitClient {
  return {
    clone: vi.fn().mockImplementation(async () => {
      const dir = `/tmp/cloned-${++cloneCounter}`;
      // Create the directory in the in-memory FS so that rename() works
      await fs.mkdir(dir, { recursive: true });
      return dir;
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CloneCache', () => {
  it('calls gitClient.clone() on cache miss', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/test');

    await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);
    expect(gitClient.clone).toHaveBeenCalledOnce();
  });

  it('returns cached path on cache hit within TTL', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/test', 60_000);

    // First call — cache miss
    const path1 = await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);

    // Second call — cache hit
    const path2 = await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);

    expect(gitClient.clone).toHaveBeenCalledOnce(); // Only cloned once
    expect(path1).toBe(path2);
  });

  it('re-clones when TTL expires', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    // TTL of 0ms means everything is expired immediately
    const cache = new CloneCache(fs, '/home/test', 0);

    await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);
    // Wait a tick to ensure Date.now() has advanced
    await new Promise((r) => setTimeout(r, 5));
    await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);

    expect(gitClient.clone).toHaveBeenCalledTimes(2);
  });

  it('invalidate removes cached entry', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/test');

    await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);
    await cache.invalidate('https://github.com/owner/repo.git');

    // Should clone again after invalidation
    await cache.getOrClone('https://github.com/owner/repo.git', undefined, gitClient);
    expect(gitClient.clone).toHaveBeenCalledTimes(2);
  });

  it('clear removes all cache entries', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/test');

    await cache.getOrClone('https://github.com/owner/repo1.git', undefined, gitClient);
    await cache.getOrClone('https://github.com/owner/repo2.git', undefined, gitClient);
    await cache.clear();

    // Should clone again
    await cache.getOrClone('https://github.com/owner/repo1.git', undefined, gitClient);
    expect(gitClient.clone).toHaveBeenCalledTimes(3);
  });

  it('uses different cache keys for different refs', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/test');

    await cache.getOrClone('https://github.com/owner/repo.git', 'main', gitClient);
    await cache.getOrClone('https://github.com/owner/repo.git', 'develop', gitClient);

    expect(gitClient.clone).toHaveBeenCalledTimes(2);
  });
});
