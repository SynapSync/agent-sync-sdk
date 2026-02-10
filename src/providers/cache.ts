import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { FileSystemAdapter } from '../types/config.js';
import type { GitClient } from '../types/source.js';

export interface CacheMeta {
  readonly createdAt: number;
  readonly ttlMs: number;
  readonly etag?: string;
}

export class CloneCache {
  private readonly cacheDir: string;

  constructor(
    private readonly fs: FileSystemAdapter,
    homeDir: string,
    private readonly defaultTtlMs: number = 3_600_000,
  ) {
    this.cacheDir = join(homeDir, '.cache', 'cognit', 'clones');
  }

  async getOrClone(url: string, ref: string | undefined, gitClient: GitClient): Promise<string> {
    const key = this.cacheKey(url, ref);
    const metaPath = join(this.cacheDir, `${key}.meta.json`);
    const cachePath = join(this.cacheDir, key);

    try {
      const metaStr = await this.fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaStr) as CacheMeta;
      if (Date.now() - meta.createdAt < meta.ttlMs) {
        if (await this.fs.exists(cachePath)) {
          return cachePath;
        }
      }
    } catch {
      // Cache miss
    }

    const tempDir = await gitClient.clone(url, {
      ...(ref != null && { ref }),
    });
    await this.fs.mkdir(this.cacheDir, { recursive: true });

    if (await this.fs.exists(cachePath)) {
      await this.fs.rm(cachePath, { recursive: true, force: true });
    }
    await this.fs.rename(tempDir, cachePath);

    const meta: CacheMeta = { createdAt: Date.now(), ttlMs: this.defaultTtlMs };
    await this.fs.writeFile(metaPath, JSON.stringify(meta), 'utf-8');

    return cachePath;
  }

  async invalidate(url: string, ref?: string): Promise<void> {
    const key = this.cacheKey(url, ref);
    const metaPath = join(this.cacheDir, `${key}.meta.json`);
    const cachePath = join(this.cacheDir, key);
    try { await this.fs.rm(metaPath, { force: true }); } catch { /* ignore */ }
    try { await this.fs.rm(cachePath, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  async clear(): Promise<void> {
    try { await this.fs.rm(this.cacheDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  private cacheKey(url: string, ref?: string): string {
    const normalized = `${url.replace(/\.git$/, '')}#${ref ?? 'HEAD'}`;
    return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }
}

export class FetchCache {
  private readonly cacheDir: string;

  constructor(
    private readonly fs: FileSystemAdapter,
    homeDir: string,
    private readonly defaultTtlMs: number = 900_000,
  ) {
    this.cacheDir = join(homeDir, '.cache', 'cognit', 'fetch');
  }

  async getOrFetch(url: string, options?: { ttl?: number }): Promise<string> {
    const key = this.cacheKey(url);
    const metaPath = join(this.cacheDir, `${key}.meta.json`);
    const contentPath = join(this.cacheDir, `${key}.content`);
    const ttlMs = options?.ttl ?? this.defaultTtlMs;

    try {
      const metaStr = await this.fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaStr) as CacheMeta;
      if (Date.now() - meta.createdAt < ttlMs) {
        return this.fs.readFile(contentPath, 'utf-8');
      }
    } catch {
      // Cache miss
    }

    const response = await fetch(url, { headers: { 'User-Agent': 'agent-sync-sdk' } });
    if (!response.ok) throw new Error(`Fetch failed: ${url} (${response.status})`);
    const content = await response.text();

    await this.fs.mkdir(this.cacheDir, { recursive: true });
    await this.fs.writeFile(contentPath, content, 'utf-8');

    const etag = response.headers.get('etag');
    const meta: CacheMeta = {
      createdAt: Date.now(),
      ttlMs,
      ...(etag != null && { etag }),
    };
    await this.fs.writeFile(metaPath, JSON.stringify(meta), 'utf-8');

    return content;
  }

  async clear(): Promise<void> {
    try { await this.fs.rm(this.cacheDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  private cacheKey(url: string): string {
    return createHash('sha256').update(url).digest('hex').slice(0, 16);
  }
}
