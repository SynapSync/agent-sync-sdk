import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloneCache, FetchCache } from '../../src/providers/cache.js';
import { InMemoryFileSystem } from '../../src/fs/memory.js';
import { createHash } from 'node:crypto';
import type { GitClient } from '../../src/types/source.js';

let cloneCounter = 0;

function createMockGitClient(fs: InMemoryFileSystem): GitClient {
  return {
    clone: vi.fn().mockImplementation(async () => {
      const dir = `/tmp/cloned-ext-${++cloneCounter}`;
      await fs.mkdir(dir, { recursive: true });
      return dir;
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

function computeCacheKey(url: string, ref?: string): string {
  const normalized = `${url.replace(/\.git$/, '')}#${ref ?? 'HEAD'}`;
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

describe('CloneCache (extended)', () => {
  beforeEach(() => {
    cloneCounter = 0;
  });

  it('cache miss clones, stores meta, returns path', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/user');

    const path = await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);

    expect(gitClient.clone).toHaveBeenCalledOnce();
    expect(path).toContain('.cache/cognit/clones');

    // Meta file should exist
    const key = computeCacheKey('https://github.com/a/b.git');
    const metaPath = `/home/user/.cache/cognit/clones/${key}.meta.json`;
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta).toHaveProperty('createdAt');
    expect(meta).toHaveProperty('ttlMs');
  });

  it('cache hit (valid TTL) returns cached path without cloning', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/user', 60_000);

    const path1 = await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);
    const path2 = await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);

    expect(gitClient.clone).toHaveBeenCalledOnce();
    expect(path1).toBe(path2);
  });

  it('cache expired triggers re-clone', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    // TTL of 0ms means expired immediately
    const cache = new CloneCache(fs, '/home/user', 0);

    await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);
    await new Promise((r) => setTimeout(r, 5));
    await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);

    expect(gitClient.clone).toHaveBeenCalledTimes(2);
  });

  it('invalidate removes meta and cache directory', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/user');

    await cache.getOrClone('https://github.com/a/b.git', undefined, gitClient);

    const key = computeCacheKey('https://github.com/a/b.git');
    const metaPath = `/home/user/.cache/cognit/clones/${key}.meta.json`;
    const cachePath = `/home/user/.cache/cognit/clones/${key}`;

    // Both should exist before invalidation
    expect(await fs.exists(metaPath)).toBe(true);
    expect(await fs.exists(cachePath)).toBe(true);

    await cache.invalidate('https://github.com/a/b.git');

    // After invalidation, meta should be removed
    expect(await fs.exists(metaPath)).toBe(false);
    // Cache dir should be removed
    expect(await fs.exists(cachePath)).toBe(false);
  });

  it('clear removes entire cache directory', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/user');

    await cache.getOrClone('https://github.com/a/repo1.git', undefined, gitClient);
    await cache.getOrClone('https://github.com/a/repo2.git', undefined, gitClient);

    expect(await fs.exists('/home/user/.cache/cognit/clones')).toBe(true);

    await cache.clear();

    expect(await fs.exists('/home/user/.cache/cognit/clones')).toBe(false);
  });

  it('cacheKey is deterministic (same URL+ref produces same key)', async () => {
    const fs = new InMemoryFileSystem();
    const gitClient = createMockGitClient(fs);
    const cache = new CloneCache(fs, '/home/user');

    const path1 = await cache.getOrClone('https://github.com/a/b.git', 'main', gitClient);
    // Second call should be a cache hit
    const path2 = await cache.getOrClone('https://github.com/a/b.git', 'main', gitClient);

    expect(gitClient.clone).toHaveBeenCalledOnce();
    expect(path1).toBe(path2);
  });
});

describe('FetchCache', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '# Hello World',
        headers: new Headers({ etag: '"abc123"' }),
      }),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('cache miss fetches, stores content and meta', async () => {
    const fs = new InMemoryFileSystem();
    const cache = new FetchCache(fs, '/home/user');

    const content = await cache.getOrFetch('https://example.com/SKILL.md');

    expect(content).toBe('# Hello World');
    expect(fetch).toHaveBeenCalledOnce();

    // Content and meta should be persisted
    const key = createHash('sha256')
      .update('https://example.com/SKILL.md')
      .digest('hex')
      .slice(0, 16);
    const contentPath = `/home/user/.cache/cognit/fetch/${key}.content`;
    const metaPath = `/home/user/.cache/cognit/fetch/${key}.meta.json`;
    expect(await fs.exists(contentPath)).toBe(true);
    expect(await fs.exists(metaPath)).toBe(true);

    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
    expect(meta.etag).toBe('"abc123"');
  });

  it('cache hit returns cached content without fetching', async () => {
    const fs = new InMemoryFileSystem();
    const cache = new FetchCache(fs, '/home/user', 60_000);

    await cache.getOrFetch('https://example.com/SKILL.md');
    const content2 = await cache.getOrFetch('https://example.com/SKILL.md');

    expect(content2).toBe('# Hello World');
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('clear removes cache directory', async () => {
    const fs = new InMemoryFileSystem();
    const cache = new FetchCache(fs, '/home/user');

    await cache.getOrFetch('https://example.com/SKILL.md');
    expect(await fs.exists('/home/user/.cache/cognit/fetch')).toBe(true);

    await cache.clear();
    expect(await fs.exists('/home/user/.cache/cognit/fetch')).toBe(false);
  });
});
