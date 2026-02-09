# Sprint 4: Providers

**Duration:** 5 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 (types, errors), Sprint 3 (SourceParser, DiscoveryService, GitClient)
**Goal:** Implement the provider registry and the first two concrete providers (GitHub, Local), plus a caching layer for git clones and HTTP fetches. At the end of this sprint, the SDK can resolve `owner/repo`, local paths, and well-known URLs into concrete cognitives ready for installation.

---

## Phase 4.1: Provider Interface & Registry (1 day)

### Task 4.1.1: Create src/providers/registry.ts

**File:** `src/providers/registry.ts`
**Steps:**
- [ ] Implement `ProviderRegistryImpl` class implementing `ProviderRegistry`
- [ ] Store providers in an ordered array (first match wins)
- [ ] Implement `register(provider)` that adds to the end; throw if duplicate `id`
- [ ] Implement `findProvider(source)` that iterates providers calling `match(source)` and returns the first that matches
- [ ] Implement `getAll()` that returns a readonly copy
- [ ] Constructor accepts `EventBus` for future event emission

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { HostProvider, ProviderRegistry, ProviderMatch } from '../types/source.js';
import type { EventBus } from '../types/events.js';

export class ProviderRegistryImpl implements ProviderRegistry {
  private readonly providers: HostProvider[] = [];

  constructor(private readonly eventBus: EventBus) {}

  register(provider: HostProvider): void {
    if (this.providers.some((p) => p.id === provider.id)) {
      throw new Error(`Provider with id "${provider.id}" already registered`);
    }
    this.providers.push(provider);
  }

  findProvider(source: string): HostProvider | null {
    for (const provider of this.providers) {
      const match = provider.match(source);
      if (match.matches) return provider;
    }
    return null;
  }

  getAll(): readonly HostProvider[] {
    return [...this.providers];
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 4.1.2: Create src/providers/register-defaults.ts

**File:** `src/providers/register-defaults.ts`
**Steps:**
- [ ] Implement `registerDefaultProviders(registry, config)` function
- [ ] Register providers in priority order:
  1. MintlifyProvider (specific host, highest priority for URL-based)
  2. HuggingFaceProvider (specific host)
  3. DirectURLProvider (catch-all for `**/SKILL.md` URLs)
- [ ] Note: GitHub and Local providers are not registered here -- they are invoked directly based on `SourceDescriptor.kind` from the SourceParser
- [ ] Custom providers from `config.providers.custom` are registered first (before defaults)

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { ProviderRegistry } from '../types/source.js';
import type { SDKConfig } from '../types/config.js';
import { MintlifyProvider } from './mintlify.js';
import { HuggingFaceProvider } from './huggingface.js';
import { DirectURLProvider } from './direct.js';

export function registerDefaultProviders(
  registry: ProviderRegistry,
  config: SDKConfig,
): void {
  // Custom providers first (user-specified take priority)
  for (const custom of config.providers.custom) {
    registry.register(custom);
  }

  // Built-in providers in priority order
  registry.register(new MintlifyProvider());
  registry.register(new HuggingFaceProvider());
  registry.register(new DirectURLProvider());
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 4.2: GitHub Provider (2 days)

### Task 4.2.1: Create src/providers/github.ts

**File:** `src/providers/github.ts`
**Steps:**
- [ ] Implement `GitHubProvider` class implementing `HostProvider`
- [ ] Set `id = 'github'` and `displayName = 'GitHub'`
- [ ] Implement `match(source)`:
  - Match `owner/repo` shorthand
  - Match `owner/repo/path/to/skill` shorthand with subpath
  - Match `owner/repo@skill-name` shorthand with name filter
  - Match `https://github.com/owner/repo` full URLs
  - Match `https://github.com/owner/repo/tree/branch` with ref
  - Match `https://github.com/owner/repo/tree/branch/path` with ref + subpath
- [ ] Implement `fetchAll(source, options)`:
  - Clone repository using `GitClient`
  - Discover cognitives using `DiscoveryService` on the cloned directory
  - Apply subpath filter if specified
  - Apply name filter if specified
  - Convert discovered `Cognitive[]` to `RemoteCognitive[]`
  - Clean up temp directory
- [ ] Implement `fetchCognitive(source, options)`:
  - For single-file GitHub blob URLs ending in SKILL.md/PROMPT.md/etc
  - Convert blob URL to raw.githubusercontent.com URL
  - Fetch content via HTTP
  - Parse frontmatter, return `RemoteCognitive`
  - Return null if URL is not a single-file source
- [ ] Implement `toRawUrl(url)`:
  - Convert `github.com/o/r/blob/main/SKILL.md` to `raw.githubusercontent.com/o/r/main/SKILL.md`
- [ ] Implement `getSourceIdentifier(source)`:
  - Return `owner/repo` extracted from the URL

**BEFORE:** No file exists.

**AFTER:**
```typescript
import matter from 'gray-matter';
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import type { GitClient } from '../types/source.js';
import type { EventBus } from '../types/events.js';
import type { SourceIdentifier } from '../types/brands.js';
import { sourceIdentifier } from '../types/brands.js';
import { safeName } from '../types/brands.js';
import { ProviderFetchError, NoCognitivesFoundError } from '../errors/provider.js';

// Interfaces for dependencies (injected via constructor)
interface DiscoveryService {
  discover(basePath: string, options?: { subpath?: string; types?: string[] }): Promise<Array<{
    name: string; description: string; path: string; type: string; rawContent: string; metadata: Record<string, unknown>;
  }>>;
}

const GITHUB_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/;
const SHORTHAND_RE = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/;
const BLOB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;

export class GitHubProvider implements HostProvider {
  readonly id = 'github';
  readonly displayName = 'GitHub';

  constructor(
    private readonly gitClient: GitClient,
    private readonly discoveryService: DiscoveryService,
    private readonly eventBus: EventBus,
  ) {}

  match(source: string): ProviderMatch {
    if (GITHUB_URL_RE.test(source)) {
      const match = source.match(GITHUB_URL_RE)!;
      return {
        matches: true,
        sourceIdentifier: sourceIdentifier(`${match[1]}/${match[2]}`),
      };
    }
    if (SHORTHAND_RE.test(source) && !source.startsWith('.') && !source.includes('://')) {
      const match = source.match(SHORTHAND_RE)!;
      return {
        matches: true,
        sourceIdentifier: sourceIdentifier(`${match[1]}/${match[2]}`),
      };
    }
    return { matches: false };
  }

  async fetchCognitive(
    source: string,
    options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive | null> {
    const blobMatch = source.match(BLOB_RE);
    if (!blobMatch) return null;

    const rawUrl = this.toRawUrl(source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: rawUrl });

    try {
      const response = await fetch(rawUrl, {
        signal: options?.signal,
        headers: { 'User-Agent': 'agent-sync-sdk' },
      });
      if (!response.ok) {
        this.eventBus.emit('provider:fetch:error', {
          providerId: this.id, url: rawUrl, error: `HTTP ${response.status}`,
        });
        return null;
      }

      const content = await response.text();
      const parsed = matter(content);
      const data = parsed.data as Record<string, unknown>;
      const name = (data['name'] as string) ?? blobMatch[4]!.split('/').pop()?.replace(/\.md$/i, '') ?? 'unknown';

      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: rawUrl, found: true });

      return {
        name,
        description: (data['description'] as string) ?? '',
        content,
        installName: safeName(name.toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: source,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(`${blobMatch[1]}/${blobMatch[2]}`),
        type: (data['cognitiveType'] as 'skill' | 'agent' | 'prompt' | 'rule') ?? 'skill',
        metadata: Object.freeze({ ...data }),
      };
    } catch (cause) {
      this.eventBus.emit('provider:fetch:error', {
        providerId: this.id, url: rawUrl, error: (cause as Error).message,
      });
      throw new ProviderFetchError(rawUrl, this.id, undefined, { cause: cause as Error });
    }
  }

  async fetchAll(
    source: string,
    options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive[]> {
    // Clone the repository
    const cloneUrl = this.resolveCloneUrl(source);
    const tempDir = await this.gitClient.clone(cloneUrl, {
      ref: options?.ref,
    });

    try {
      // Discover cognitives in the cloned directory
      const cognitives = await this.discoveryService.discover(tempDir, {
        subpath: options?.subpath,
      });

      if (cognitives.length === 0) {
        throw new NoCognitivesFoundError(source, this.id);
      }

      const ownerRepo = this.getSourceIdentifier(source);

      // Convert to RemoteCognitive[]
      return cognitives.map((cog) => ({
        name: String(cog.name),
        description: cog.description,
        content: cog.rawContent,
        installName: safeName(String(cog.name).toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: source,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(ownerRepo),
        type: cog.type as 'skill' | 'agent' | 'prompt' | 'rule',
        metadata: Object.freeze({ ...cog.metadata }),
      }));
    } finally {
      await this.gitClient.cleanup(tempDir);
    }
  }

  toRawUrl(url: string): string {
    const blobMatch = url.match(BLOB_RE);
    if (blobMatch) {
      return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}/${blobMatch[4]}`;
    }
    return url;
  }

  getSourceIdentifier(source: string): string {
    const ghMatch = source.match(GITHUB_URL_RE);
    if (ghMatch) return `${ghMatch[1]}/${ghMatch[2]!.replace(/\.git$/, '')}`;
    const shortMatch = source.match(SHORTHAND_RE);
    if (shortMatch) return `${shortMatch[1]}/${shortMatch[2]}`;
    return source;
  }

  private resolveCloneUrl(source: string): string {
    if (source.startsWith('https://github.com/')) {
      const match = source.match(GITHUB_URL_RE);
      if (match) return `https://github.com/${match[1]}/${match[2]!.replace(/\.git$/, '')}.git`;
    }
    const shortMatch = source.match(SHORTHAND_RE);
    if (shortMatch) return `https://github.com/${shortMatch[1]}/${shortMatch[2]}.git`;
    return source;
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 4.3: Local Provider (1 day)

### Task 4.3.1: Create src/providers/local.ts

**File:** `src/providers/local.ts`
**Steps:**
- [ ] Implement `LocalProvider` class implementing `HostProvider`
- [ ] Set `id = 'local'` and `displayName = 'Local'`
- [ ] Implement `match(source)`:
  - Match absolute paths: `/Users/bob/skills`
  - Match relative paths: `./my-skills`, `../shared-skills`
  - Match current directory: `.`
  - Match Windows paths: `C:\Users\bob\skills`
- [ ] Implement `fetchAll(source, options)`:
  - Resolve path relative to `cwd`
  - Discover cognitives using `DiscoveryService`
  - Convert discovered `Cognitive[]` to `RemoteCognitive[]`
  - No cloning needed
- [ ] Implement `fetchCognitive(source, options)`:
  - Read a single cognitive file from the filesystem
  - Parse frontmatter, return `RemoteCognitive`
- [ ] Implement `toRawUrl(url)`: return the path unchanged
- [ ] Implement `getSourceIdentifier(source)`: return the resolved absolute path

**BEFORE:** No file exists.

**AFTER:**
```typescript
import * as path from 'node:path';
import matter from 'gray-matter';
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import type { FileSystemAdapter } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import { sourceIdentifier } from '../types/brands.js';
import { safeName } from '../types/brands.js';

interface DiscoveryService {
  discover(basePath: string, options?: { subpath?: string }): Promise<Array<{
    name: string; description: string; path: string; type: string; rawContent: string; metadata: Record<string, unknown>;
  }>>;
}

export class LocalProvider implements HostProvider {
  readonly id = 'local';
  readonly displayName = 'Local';

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly discoveryService: DiscoveryService,
    private readonly eventBus: EventBus,
    private readonly cwd: string,
  ) {}

  match(source: string): ProviderMatch {
    if (
      source.startsWith('/') ||
      source.startsWith('./') ||
      source.startsWith('../') ||
      source === '.' ||
      source === '..' ||
      /^[A-Z]:[/\\]/i.test(source)
    ) {
      const resolved = path.resolve(this.cwd, source);
      return {
        matches: true,
        sourceIdentifier: sourceIdentifier(resolved),
      };
    }
    return { matches: false };
  }

  async fetchCognitive(
    source: string,
    _options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive | null> {
    const resolved = path.resolve(this.cwd, source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: resolved });

    try {
      const content = await this.fs.readFile(resolved, 'utf-8');
      const parsed = matter(content);
      const data = parsed.data as Record<string, unknown>;
      const name = (data['name'] as string) ?? path.basename(path.dirname(resolved));

      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: resolved, found: true });

      return {
        name,
        description: (data['description'] as string) ?? '',
        content,
        installName: safeName(name.toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: `file://${resolved}`,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(resolved),
        type: (data['cognitiveType'] as 'skill' | 'agent' | 'prompt' | 'rule') ?? 'skill',
        metadata: Object.freeze({ ...data }),
      };
    } catch {
      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: resolved, found: false });
      return null;
    }
  }

  async fetchAll(
    source: string,
    options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive[]> {
    const resolved = path.resolve(this.cwd, source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: resolved });

    const cognitives = await this.discoveryService.discover(resolved, {
      subpath: options?.subpath,
    });

    this.eventBus.emit('provider:fetch:complete', {
      providerId: this.id,
      url: resolved,
      found: cognitives.length > 0,
    });

    return cognitives.map((cog) => ({
      name: String(cog.name),
      description: cog.description,
      content: cog.rawContent,
      installName: safeName(String(cog.name).toLowerCase().replace(/\s+/g, '-')),
      sourceUrl: `file://${cog.path}`,
      providerId: this.id,
      sourceIdentifier: sourceIdentifier(resolved),
      type: cog.type as 'skill' | 'agent' | 'prompt' | 'rule',
      metadata: Object.freeze({ ...cog.metadata }),
    }));
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    return path.resolve(this.cwd, source);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 4.4: Caching Layer (0.5 days)

### Task 4.4.1: Create src/providers/cache.ts

**File:** `src/providers/cache.ts`
**Steps:**
- [ ] Implement `CloneCache` class for caching git clones
  - Cache directory: `~/.cache/cognit/clones/`
  - Cache key: SHA-256 of `{normalized_url}#{ref || 'HEAD'}`
  - TTL: configurable, default 1 hour
  - `getOrClone(url, ref, gitClient)`: return cached path or clone and cache
  - `invalidate(url, ref)`: remove specific entry
  - `clear()`: remove all cached clones
- [ ] Implement `FetchCache` class for caching HTTP responses
  - Cache directory: `~/.cache/cognit/fetch/`
  - Cache key: SHA-256 of URL
  - TTL: configurable, default 15 minutes
  - `getOrFetch(url, options?)`: return cached response or fetch and cache
  - `clear()`: remove all cached fetches
- [ ] Both caches use `FileSystemAdapter` for I/O
- [ ] Both caches store metadata (timestamp, TTL, ETag) alongside cached content

**BEFORE:** No file exists.

**AFTER:**
```typescript
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
    private readonly defaultTtlMs: number = 3_600_000, // 1 hour
  ) {
    this.cacheDir = join(homeDir, '.cache', 'cognit', 'clones');
  }

  async getOrClone(
    url: string,
    ref: string | undefined,
    gitClient: GitClient,
  ): Promise<string> {
    const key = this.cacheKey(url, ref);
    const metaPath = join(this.cacheDir, `${key}.meta.json`);
    const cachePath = join(this.cacheDir, key);

    // Check if cached and not expired
    try {
      const metaStr = await this.fs.readFile(metaPath, 'utf-8');
      const meta: CacheMeta = JSON.parse(metaStr);
      if (Date.now() - meta.createdAt < meta.ttlMs) {
        if (await this.fs.exists(cachePath)) {
          return cachePath;
        }
      }
    } catch {
      // No cache or corrupted -- proceed to clone
    }

    // Clone and cache
    const tempDir = await gitClient.clone(url, { ref });
    await this.fs.mkdir(this.cacheDir, { recursive: true });

    // Move clone to cache location
    if (await this.fs.exists(cachePath)) {
      await this.fs.rm(cachePath, { recursive: true, force: true });
    }
    await this.fs.rename(tempDir, cachePath);

    // Write metadata
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
    private readonly defaultTtlMs: number = 900_000, // 15 minutes
  ) {
    this.cacheDir = join(homeDir, '.cache', 'cognit', 'fetch');
  }

  async getOrFetch(url: string, options?: { ttl?: number }): Promise<string> {
    const key = this.cacheKey(url);
    const metaPath = join(this.cacheDir, `${key}.meta.json`);
    const contentPath = join(this.cacheDir, `${key}.content`);
    const ttlMs = options?.ttl ?? this.defaultTtlMs;

    // Check cache
    try {
      const metaStr = await this.fs.readFile(metaPath, 'utf-8');
      const meta: CacheMeta = JSON.parse(metaStr);
      if (Date.now() - meta.createdAt < ttlMs) {
        return this.fs.readFile(contentPath, 'utf-8');
      }
    } catch {
      // Cache miss
    }

    // Fetch and cache
    const response = await fetch(url, { headers: { 'User-Agent': 'agent-sync-sdk' } });
    if (!response.ok) throw new Error(`Fetch failed: ${url} (${response.status})`);
    const content = await response.text();

    await this.fs.mkdir(this.cacheDir, { recursive: true });
    await this.fs.writeFile(contentPath, content, 'utf-8');
    const meta: CacheMeta = {
      createdAt: Date.now(),
      ttlMs,
      etag: response.headers.get('etag') ?? undefined,
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
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 4.5: Provider Barrel & Stub Providers (0.5 days)

### Task 4.5.1: Create stub providers for Mintlify, HuggingFace, Direct

**Files:** `src/providers/mintlify.ts`, `src/providers/huggingface.ts`, `src/providers/direct.ts`
**Steps:**
- [ ] Create `MintlifyProvider` stub implementing `HostProvider` with `id = 'mintlify'`
  - `match()`: match HTTP(S) URLs ending in cognitive file names, excluding git hosts
  - `fetchCognitive()`: fetch URL, validate `metadata.mintlify-proj` in frontmatter, return `RemoteCognitive`
  - Other methods: placeholder implementations
- [ ] Create `HuggingFaceProvider` stub with `id = 'huggingface'`
  - `match()`: match `huggingface.co` URLs with `/spaces/` path
  - Other methods: placeholder implementations
- [ ] Create `DirectURLProvider` stub with `id = 'direct-url'`
  - `match()`: match any HTTP(S) URL ending in a cognitive file name
  - `fetchCognitive()`: fetch URL directly, parse frontmatter
  - Other methods: placeholder implementations

**BEFORE:** No files exist.

**AFTER (example Mintlify signature):**
```typescript
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';

export class MintlifyProvider implements HostProvider {
  readonly id = 'mintlify';
  readonly displayName = 'Mintlify';

  match(source: string): ProviderMatch { /* ... */ }
  async fetchCognitive(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive | null> { /* ... */ }
  async fetchAll(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive[]> { /* ... */ }
  toRawUrl(url: string): string { /* ... */ }
  getSourceIdentifier(source: string): string { /* ... */ }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 4.5.2: Create src/providers/index.ts

**File:** `src/providers/index.ts`
**Steps:**
- [ ] Barrel export `ProviderRegistryImpl`, `registerDefaultProviders`
- [ ] Export all concrete providers: `GitHubProvider`, `LocalProvider`, `MintlifyProvider`, `HuggingFaceProvider`, `DirectURLProvider`
- [ ] Export `CloneCache`, `FetchCache`

**BEFORE:** No file exists.

**AFTER:**
```typescript
export { ProviderRegistryImpl } from './registry.js';
export { registerDefaultProviders } from './register-defaults.js';
export { GitHubProvider } from './github.js';
export { LocalProvider } from './local.js';
export { MintlifyProvider } from './mintlify.js';
export { HuggingFaceProvider } from './huggingface.js';
export { DirectURLProvider } from './direct.js';
export { CloneCache, FetchCache } from './cache.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 4.6: Tests (0.5 days)

### Task 4.6.1: Create tests/providers/registry.test.ts

**File:** `tests/providers/registry.test.ts`
**Steps:**
- [ ] Test `register()` adds a provider
- [ ] Test `register()` rejects duplicate `id`
- [ ] Test `findProvider()` returns the first matching provider
- [ ] Test `findProvider()` respects registration order (first match wins)
- [ ] Test `findProvider()` returns null for unmatched sources
- [ ] Test `getAll()` returns all registered providers in order

**Verification:**
```bash
pnpm vitest run tests/providers/registry.test.ts
```

---

### Task 4.6.2: Create tests/providers/github.test.ts

**File:** `tests/providers/github.test.ts`
**Steps:**
- [ ] Test `match()` with `owner/repo` shorthand -> matches, sourceIdentifier = `owner/repo`
- [ ] Test `match()` with `https://github.com/owner/repo` -> matches
- [ ] Test `match()` with `https://gitlab.com/owner/repo` -> does NOT match
- [ ] Test `match()` with `./local/path` -> does NOT match
- [ ] Test `toRawUrl()` converts blob URLs to raw.githubusercontent.com URLs
- [ ] Test `getSourceIdentifier()` extracts `owner/repo`
- [ ] Test `fetchAll()` with mock `GitClient` and mock `DiscoveryService`:
  - Verify `gitClient.clone()` is called with correct URL
  - Verify `discoveryService.discover()` is called with temp dir
  - Verify returned `RemoteCognitive[]` has correct fields
  - Verify `gitClient.cleanup()` is called after operation

**Verification:**
```bash
pnpm vitest run tests/providers/github.test.ts
```

---

### Task 4.6.3: Create tests/providers/local.test.ts

**File:** `tests/providers/local.test.ts`
**Steps:**
- [ ] Test `match()` with `./relative/path` -> matches
- [ ] Test `match()` with `/absolute/path` -> matches
- [ ] Test `match()` with `.` -> matches
- [ ] Test `match()` with `owner/repo` -> does NOT match
- [ ] Test `fetchAll()` with `InMemoryFileSystem` seeded with cognitives
- [ ] Test `getSourceIdentifier()` returns resolved absolute path

**Verification:**
```bash
pnpm vitest run tests/providers/local.test.ts
```

---

### Task 4.6.4: Create tests/providers/cache.test.ts

**File:** `tests/providers/cache.test.ts`
**Steps:**
- [ ] Test `CloneCache.getOrClone()` calls `gitClient.clone()` on cache miss
- [ ] Test `CloneCache.getOrClone()` returns cached path on cache hit (within TTL)
- [ ] Test `CloneCache.getOrClone()` re-clones when TTL expires
- [ ] Test `CloneCache.invalidate()` removes cached entry
- [ ] Test `CloneCache.clear()` removes all entries
- [ ] Test `FetchCache` with mock fetch responses (basic store/retrieve)

**Verification:**
```bash
pnpm vitest run tests/providers/cache.test.ts
```

---

## Definition of Done

- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm vitest run tests/providers/` passes all provider tests
- [ ] `ProviderRegistryImpl` correctly registers providers and finds matches by priority
- [ ] `GitHubProvider` matches GitHub URLs and shorthands, converts to raw URLs, extracts owner/repo
- [ ] `GitHubProvider.fetchAll()` clones, discovers, converts, and cleans up (verified with mocks)
- [ ] `LocalProvider` matches local paths, resolves relative to cwd, discovers cognitives
- [ ] `CloneCache` caches git clones with configurable TTL
- [ ] `FetchCache` caches HTTP responses with configurable TTL
- [ ] `registerDefaultProviders()` registers Mintlify, HuggingFace, DirectURL in correct order
- [ ] All tests use mock `GitClient` and `InMemoryFileSystem` -- no real network or filesystem access

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| GitHub API rate limiting during development | Medium | Low | Use git clone instead of API; token optional |
| Provider `match()` regex conflicts (multiple providers match same URL) | Medium | Medium | Clear priority order; comprehensive test matrix |
| Cache corruption on disk | Low | Low | Always validate cache metadata; treat corrupted as miss |
| `simple-git` behavior varies across platforms | Medium | Medium | Abstract behind `GitClient` interface; mock in tests |
| Mintlify/HuggingFace APIs change | Low | Medium | Provider stubs now; full implementation in Sprint 7 |

---

## Rollback Strategy

If this sprint fails:
1. `src/providers/` directory can be deleted without affecting Sprints 1-3
2. No modifications to types, errors, config, events, or discovery modules
3. `ProviderRegistry` and `HostProvider` interfaces in `types/` remain stable regardless
4. Cache directories are created lazily -- no cleanup needed if feature is dropped
5. GitHub and Local providers can be reimplemented from the interface contracts in `types/source.ts`
