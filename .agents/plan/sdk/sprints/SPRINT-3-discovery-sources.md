# Sprint 3: Discovery & Sources

**Duration:** 5 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 (types, errors), Sprint 2 (config, events, FileSystemAdapter)
**Goal:** Build the discovery pipeline (scan filesystem, parse frontmatter, filter, validate) and the source resolution system (parse ambiguous identifiers into structured descriptors, git clone wrapper). At the end of this sprint, the SDK can discover cognitives on disk and resolve arbitrary source strings into actionable descriptors.

---

## Phase 3.1: Scanner (1 day)

### Task 3.1.1: Create src/discovery/scanner.ts

**File:** `src/discovery/scanner.ts`
**Steps:**
- [ ] Implement `CognitiveScanner` class that accepts `FileSystemAdapter`
- [ ] Implement `scan(basePath, options?)` that traverses directories finding cognitive files
- [ ] Support finding `SKILL.md`, `PROMPT.md`, `RULE.md`, `AGENT.md` files using `COGNITIVE_FILE_NAMES` map
- [ ] Build priority search order: for each `CognitiveType`, check `{basePath}/{subdir}/*/` first, then fall back to `{basePath}/*/`
- [ ] Return array of `{ path: string; type: CognitiveType; fileName: string }` raw scan results
- [ ] Skip hidden directories (starting with `.`) and `node_modules`
- [ ] Use `FileSystemAdapter` for all I/O -- never import `fs` directly

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { FileSystemAdapter } from '../types/config.js';
import type { CognitiveType } from '../types/cognitive.js';
import { COGNITIVE_TYPE_CONFIGS, COGNITIVE_SUBDIRS, COGNITIVE_FILE_NAMES } from '../types/cognitive.js';

export interface ScanResult {
  /** Absolute path to the directory containing the cognitive file */
  readonly path: string;
  /** The cognitive type detected from the filename */
  readonly type: CognitiveType;
  /** The cognitive file name (e.g., "SKILL.md") */
  readonly fileName: string;
}

export interface ScanOptions {
  /** Only scan for these types. Default: all types */
  readonly types?: CognitiveType[];
  /** Subpath within basePath to restrict scanning */
  readonly subpath?: string;
  /** Maximum depth for directory traversal. Default: 3 */
  readonly maxDepth?: number;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '__pycache__']);

export class CognitiveScanner {
  constructor(private readonly fs: FileSystemAdapter) {}

  async scan(basePath: string, options?: ScanOptions): Promise<ScanResult[]> {
    const types = options?.types ?? (Object.keys(COGNITIVE_TYPE_CONFIGS) as CognitiveType[]);
    const searchBase = options?.subpath ? `${basePath}/${options.subpath}` : basePath;
    const results: ScanResult[] = [];

    for (const type of types) {
      const subdir = COGNITIVE_SUBDIRS[type];
      const fileName = COGNITIVE_FILE_NAMES[type];

      // Priority 1: {basePath}/{subdir}/<name>/{FILE}.md
      const typedDir = `${searchBase}/${subdir}`;
      if (await this.fs.exists(typedDir)) {
        await this.scanDirectory(typedDir, fileName, type, results, 0, options?.maxDepth ?? 3);
      }

      // Priority 2: {basePath}/<name>/{FILE}.md (flat layout)
      await this.scanDirectory(searchBase, fileName, type, results, 0, options?.maxDepth ?? 3);
    }

    return this.deduplicateResults(results);
  }

  private async scanDirectory(
    dir: string,
    targetFile: string,
    type: CognitiveType,
    results: ScanResult[],
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await this.fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          const childPath = `${dir}/${entry.name}`;
          // Check if this directory contains the target file
          if (await this.fs.exists(`${childPath}/${targetFile}`)) {
            results.push({ path: childPath, type, fileName: targetFile });
          } else {
            await this.scanDirectory(childPath, targetFile, type, results, depth + 1, maxDepth);
          }
        }
      }
    } catch {
      // Directory doesn't exist or permission denied -- skip silently
    }
  }

  private deduplicateResults(results: ScanResult[]): ScanResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.path}:${r.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 3.2: Parser (1 day)

### Task 3.2.1: Create src/discovery/parser.ts

**File:** `src/discovery/parser.ts`
**Steps:**
- [ ] Implement `CognitiveParser` class that accepts `FileSystemAdapter`
- [ ] Implement `parse(scanResult): Promise<Cognitive>` that reads a cognitive file and extracts frontmatter
- [ ] Use `gray-matter` to parse YAML frontmatter from markdown files
- [ ] Extract `name`, `description`, `category`, `tags`, `author`, `version` from frontmatter
- [ ] If `name` is missing, derive from directory name
- [ ] If `description` is missing, use first non-empty line after frontmatter
- [ ] Return a fully constructed `Cognitive` object
- [ ] Throw `ParseError` for malformed frontmatter

**BEFORE:** No file exists.

**AFTER:**
```typescript
import matter from 'gray-matter';
import type { FileSystemAdapter } from '../types/config.js';
import type { Cognitive, CognitiveType } from '../types/cognitive.js';
import type { CognitiveName } from '../types/brands.js';
import { cognitiveName } from '../types/brands.js';
import { ParseError } from '../errors/discovery.js';

export interface RawScanResult {
  readonly path: string;
  readonly type: CognitiveType;
  readonly fileName: string;
}

export class CognitiveParser {
  constructor(private readonly fs: FileSystemAdapter) {}

  async parse(scan: RawScanResult): Promise<Cognitive> {
    const filePath = `${scan.path}/${scan.fileName}`;
    let rawContent: string;

    try {
      rawContent = await this.fs.readFile(filePath, 'utf-8');
    } catch (cause) {
      throw new ParseError(filePath, { cause: cause as Error });
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(rawContent);
    } catch (cause) {
      throw new ParseError(filePath, { cause: cause as Error });
    }

    const data = parsed.data as Record<string, unknown>;
    const dirName = scan.path.split('/').pop() ?? 'unknown';

    const name = this.extractName(data, dirName);
    const description = this.extractDescription(data, parsed.content);

    return {
      name,
      description,
      path: scan.path,
      type: scan.type,
      rawContent,
      metadata: Object.freeze({ ...data }),
    };
  }

  private extractName(data: Record<string, unknown>, fallback: string): CognitiveName {
    const raw = typeof data['name'] === 'string' ? data['name'] : fallback;
    return cognitiveName(raw);
  }

  private extractDescription(data: Record<string, unknown>, content: string): string {
    if (typeof data['description'] === 'string' && data['description'].length > 0) {
      return data['description'];
    }
    // Fallback: first non-empty line of content
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        return trimmed;
      }
    }
    return '';
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 3.3: Filter & Validator (0.5 days)

### Task 3.3.1: Create src/discovery/filter.ts

**File:** `src/discovery/filter.ts`
**Steps:**
- [ ] Implement `CognitiveFilter` with `filter(cognitives, criteria)` method
- [ ] Filter by `CognitiveType`: only include matching types
- [ ] Filter by name pattern: glob or substring match
- [ ] Filter by tags: intersection with requested tags
- [ ] Filter by category: match against `metadata.category`
- [ ] All filters are optional; when omitted, everything passes

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { Cognitive, CognitiveType } from '../types/cognitive.js';

export interface FilterCriteria {
  readonly type?: CognitiveType;
  readonly namePattern?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
}

export class CognitiveFilter {
  filter(cognitives: readonly Cognitive[], criteria: FilterCriteria): Cognitive[] {
    return cognitives.filter((cog) => {
      if (criteria.type && cog.type !== criteria.type) return false;

      if (criteria.namePattern) {
        const pattern = criteria.namePattern.toLowerCase();
        if (!cog.name.toLowerCase().includes(pattern)) return false;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        const cogTags = (cog.metadata['tags'] as string[] | undefined) ?? [];
        const hasMatch = criteria.tags.some((t) => cogTags.includes(t));
        if (!hasMatch) return false;
      }

      if (criteria.category) {
        const cogCategory = cog.metadata['category'] as string | undefined;
        if (cogCategory !== criteria.category) return false;
      }

      return true;
    });
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 3.3.2: Create src/discovery/validator.ts

**File:** `src/discovery/validator.ts`
**Steps:**
- [ ] Implement `CognitiveValidator` with `validate(cognitive): Result<Cognitive, ValidationError>`
- [ ] Require `name` to be non-empty
- [ ] Require `type` to be a valid `CognitiveType`
- [ ] Require `path` to be non-empty
- [ ] Warn (not error) if description is empty

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { Cognitive, CognitiveType } from '../types/cognitive.js';
import type { Result } from '../types/result.js';
import { ok, err } from '../types/result.js';
import { ValidationError } from '../errors/discovery.js';
import { COGNITIVE_TYPE_CONFIGS } from '../types/cognitive.js';

const VALID_TYPES = new Set<string>(Object.keys(COGNITIVE_TYPE_CONFIGS));

export class CognitiveValidator {
  validate(cognitive: Cognitive): Result<Cognitive, ValidationError> {
    if (!cognitive.name || cognitive.name.length === 0) {
      return err(new ValidationError('name', 'must be non-empty'));
    }

    if (!VALID_TYPES.has(cognitive.type)) {
      return err(new ValidationError('type', `must be one of: ${[...VALID_TYPES].join(', ')}`));
    }

    if (!cognitive.path || cognitive.path.length === 0) {
      return err(new ValidationError('path', 'must be non-empty'));
    }

    return ok(cognitive);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 3.4: Discovery Service (0.5 days)

### Task 3.4.1: Create src/discovery/index.ts

**File:** `src/discovery/index.ts`
**Steps:**
- [ ] Implement `DiscoveryServiceImpl` class implementing `DiscoveryService` interface
- [ ] Constructor accepts `FileSystemAdapter` and `EventBus`
- [ ] Coordinate scan -> parse -> filter -> validate pipeline
- [ ] Emit `discovery:start`, `discovery:found`, `discovery:complete` events
- [ ] Return `Result<Cognitive[], DiscoveryError>`
- [ ] Implement `discover(basePath, options?)` and `discoverByType(basePath, type, options?)`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { FileSystemAdapter } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { Cognitive, CognitiveType } from '../types/cognitive.js';
import { CognitiveScanner, type ScanOptions } from './scanner.js';
import { CognitiveParser } from './parser.js';
import { CognitiveFilter, type FilterCriteria } from './filter.js';
import { CognitiveValidator } from './validator.js';

export interface DiscoverOptions {
  readonly subpath?: string;
  readonly types?: CognitiveType[];
  readonly namePattern?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly maxDepth?: number;
}

export interface DiscoveryService {
  discover(basePath: string, options?: DiscoverOptions): Promise<Cognitive[]>;
  discoverByType(basePath: string, type: CognitiveType, options?: DiscoverOptions): Promise<Cognitive[]>;
}

export class DiscoveryServiceImpl implements DiscoveryService {
  private readonly scanner: CognitiveScanner;
  private readonly parser: CognitiveParser;
  private readonly filter: CognitiveFilter;
  private readonly validator: CognitiveValidator;

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly eventBus: EventBus,
  ) {
    this.scanner = new CognitiveScanner(fs);
    this.parser = new CognitiveParser(fs);
    this.filter = new CognitiveFilter();
    this.validator = new CognitiveValidator();
  }

  async discover(basePath: string, options?: DiscoverOptions): Promise<Cognitive[]> {
    const start = Date.now();
    this.eventBus.emit('discovery:start', { path: basePath });

    // Step 1: Scan
    const scanResults = await this.scanner.scan(basePath, {
      types: options?.types,
      subpath: options?.subpath,
      maxDepth: options?.maxDepth,
    });

    // Step 2: Parse
    const cognitives: Cognitive[] = [];
    for (const scan of scanResults) {
      try {
        const cognitive = await this.parser.parse(scan);
        // Step 3: Validate
        const validationResult = this.validator.validate(cognitive);
        if (validationResult.ok) {
          cognitives.push(validationResult.value);
          this.eventBus.emit('discovery:found', {
            cognitive: { name: cognitive.name, type: cognitive.type, path: cognitive.path, description: cognitive.description },
            type: cognitive.type,
          });
        }
      } catch {
        // Skip unparseable files -- log via event if needed
      }
    }

    // Step 4: Filter
    const criteria: FilterCriteria = {
      namePattern: options?.namePattern,
      tags: options?.tags,
      category: options?.category,
    };
    const filtered = this.filter.filter(cognitives, criteria);

    this.eventBus.emit('discovery:complete', { count: filtered.length, durationMs: Date.now() - start });
    return filtered;
  }

  async discoverByType(basePath: string, type: CognitiveType, options?: DiscoverOptions): Promise<Cognitive[]> {
    return this.discover(basePath, { ...options, types: [type] });
  }
}

export { CognitiveScanner } from './scanner.js';
export { CognitiveParser } from './parser.js';
export { CognitiveFilter } from './filter.js';
export { CognitiveValidator } from './validator.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 3.5: Source Parser (1.5 days)

### Task 3.5.1: Create src/source/parser.ts

**File:** `src/source/parser.ts`
**Steps:**
- [ ] Implement `SourceParserImpl` class implementing `SourceParser` interface
- [ ] Implement the 12-step resolution chain from 05-provider-system.md section 6.2:
  1. `isLocalPath(input)?` -> `kind: 'local'` (absolute, `./`, `../`, `.`, `..`, `C:\`)
  2. `isDirectCognitiveUrl(input)?` -> `kind: 'direct-url'` (HTTP(S) ending in SKILL.md/AGENT.md/PROMPT.md/RULE.md)
  3. `githubTreeWithPath` match? -> `kind: 'github'` with ref + subpath
  4. `githubTree` match? -> `kind: 'github'` with ref
  5. `githubRepo` match? -> `kind: 'github'`
  6. `gitlabTreeWithPath` match? -> `kind: 'gitlab'` with ref + subpath
  7. `gitlabTree` match? -> `kind: 'gitlab'` with ref
  8. `gitlabRepo` match? -> `kind: 'gitlab'`
  9. `owner/repo@name` match? -> `kind: 'github'` with nameFilter
  10. `owner/repo(/path)?` match? -> `kind: 'github'` shorthand
  11. `isWellKnownUrl(input)?` -> `kind: 'well-known'`
  12. Fallback -> `kind: 'git'`
- [ ] Implement `getOwnerRepo(source)` to extract `owner/repo` from github/gitlab descriptors

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { SourceDescriptor, SourceParser } from '../types/source.js';

const COGNITIVE_FILE_PATTERN = /\/(SKILL|AGENT|PROMPT|RULE)\.md$/i;

const GITHUB_TREE_WITH_PATH = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/;
const GITHUB_TREE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/;
const GITHUB_REPO = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;

const GITLAB_TREE_WITH_PATH = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)\/(.+)$/;
const GITLAB_TREE = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)$/;
const GITLAB_REPO = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/?$/;

const OWNER_REPO_AT_NAME = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)@(.+)$/;
const OWNER_REPO_PATH = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/(.+))?$/;

const GIT_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);

export class SourceParserImpl implements SourceParser {
  parse(source: string): SourceDescriptor {
    const trimmed = source.trim();

    // 1. Local path
    if (this.isLocalPath(trimmed)) {
      return { kind: 'local', url: trimmed, localPath: trimmed };
    }

    // 2. Direct cognitive URL
    if (this.isDirectCognitiveUrl(trimmed)) {
      return { kind: 'direct-url', url: trimmed };
    }

    // 3. GitHub tree with path
    const ghTreePath = trimmed.match(GITHUB_TREE_WITH_PATH);
    if (ghTreePath) {
      return {
        kind: 'github',
        url: `https://github.com/${ghTreePath[1]}/${ghTreePath[2]}.git`,
        ref: ghTreePath[3],
        subpath: ghTreePath[4],
      };
    }

    // 4. GitHub tree
    const ghTree = trimmed.match(GITHUB_TREE);
    if (ghTree) {
      return {
        kind: 'github',
        url: `https://github.com/${ghTree[1]}/${ghTree[2]}.git`,
        ref: ghTree[3],
      };
    }

    // 5. GitHub repo
    const ghRepo = trimmed.match(GITHUB_REPO);
    if (ghRepo) {
      return {
        kind: 'github',
        url: `https://github.com/${ghRepo[1]}/${ghRepo[2]}.git`,
      };
    }

    // 6. GitLab tree with path
    const glTreePath = trimmed.match(GITLAB_TREE_WITH_PATH);
    if (glTreePath) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glTreePath[1]}/${glTreePath[2]}.git`,
        ref: glTreePath[3],
        subpath: glTreePath[4],
      };
    }

    // 7. GitLab tree
    const glTree = trimmed.match(GITLAB_TREE);
    if (glTree) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glTree[1]}/${glTree[2]}.git`,
        ref: glTree[3],
      };
    }

    // 8. GitLab repo
    const glRepo = trimmed.match(GITLAB_REPO);
    if (glRepo) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glRepo[1]}/${glRepo[2]}.git`,
      };
    }

    // 9. owner/repo@name
    const atMatch = trimmed.match(OWNER_REPO_AT_NAME);
    if (atMatch) {
      return {
        kind: 'github',
        url: `https://github.com/${atMatch[1]}/${atMatch[2]}.git`,
        nameFilter: atMatch[3],
      };
    }

    // 10. owner/repo(/path)?
    const repoMatch = trimmed.match(OWNER_REPO_PATH);
    if (repoMatch && !trimmed.startsWith('.') && !trimmed.includes('://')) {
      return {
        kind: 'github',
        url: `https://github.com/${repoMatch[1]}/${repoMatch[2]}.git`,
        subpath: repoMatch[4],
      };
    }

    // 11. Well-known URL
    if (this.isWellKnownUrl(trimmed)) {
      return { kind: 'well-known', url: trimmed };
    }

    // 12. Fallback: generic git
    return { kind: 'git', url: trimmed };
  }

  getOwnerRepo(source: SourceDescriptor): string | undefined {
    if (source.kind !== 'github' && source.kind !== 'gitlab') return undefined;
    const match = source.url.match(/([^/]+)\/([^/]+?)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : undefined;
  }

  private isLocalPath(input: string): boolean {
    return (
      input.startsWith('/') ||
      input.startsWith('./') ||
      input.startsWith('../') ||
      input === '.' ||
      input === '..' ||
      /^[A-Z]:[/\\]/i.test(input)
    );
  }

  private isDirectCognitiveUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) return false;
    if (COGNITIVE_FILE_PATTERN.test(input)) {
      try {
        const url = new URL(input);
        // Exclude GitHub/GitLab repo pages (they have tree/blob in path)
        if (GIT_HOSTS.has(url.hostname) && !input.includes('/raw/')) return false;
      } catch {
        return false;
      }
      return true;
    }
    return false;
  }

  private isWellKnownUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) return false;
    try {
      const url = new URL(input);
      if (GIT_HOSTS.has(url.hostname)) return false;
      if (COGNITIVE_FILE_PATTERN.test(input)) return false;
      if (input.endsWith('.git')) return false;
      return true;
    } catch {
      return false;
    }
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 3.5.2: Create src/source/git.ts

**File:** `src/source/git.ts`
**Steps:**
- [ ] Implement `GitClientImpl` class implementing `GitClient` interface
- [ ] Constructor accepts `SDKConfig` and `EventBus`
- [ ] Implement `clone(url, options?)` using `simple-git`:
  - Create temp directory
  - Shallow clone with configurable depth (default: 1)
  - Support ref (branch/tag) checkout
  - Emit `git:clone:start` and `git:clone:complete` events
  - Handle timeout from config
- [ ] Implement `cleanup(tempDir)` that removes the temporary directory
- [ ] Wrap errors in `GitCloneError`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { simpleGit } from 'simple-git';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GitClient, GitCloneOptions } from '../types/source.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import { GitCloneError } from '../errors/source.js';

export class GitClientImpl implements GitClient {
  constructor(
    private readonly config: SDKConfig,
    private readonly eventBus: EventBus,
  ) {}

  async clone(url: string, options?: GitCloneOptions): Promise<string> {
    const depth = options?.depth ?? this.config.git.depth;
    const timeoutMs = options?.timeoutMs ?? this.config.git.cloneTimeoutMs;
    const start = Date.now();

    this.eventBus.emit('git:clone:start', { url });

    const tempDir = await mkdtemp(join(tmpdir(), 'cognit-'));

    try {
      const git = simpleGit({ timeout: { block: timeoutMs } });
      const cloneArgs = ['--depth', String(depth)];

      if (options?.ref) {
        cloneArgs.push('--branch', options.ref);
      }

      await git.clone(url, tempDir, cloneArgs);

      this.eventBus.emit('git:clone:complete', {
        url,
        path: tempDir,
        durationMs: Date.now() - start,
      });

      return tempDir;
    } catch (cause) {
      this.eventBus.emit('git:clone:error', {
        url,
        error: (cause as Error).message,
      });
      // Attempt cleanup on failure
      try { await rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
      throw new GitCloneError(url, (cause as Error).message, { cause: cause as Error });
    }
  }

  async cleanup(tempDir: string): Promise<void> {
    await rm(tempDir, { recursive: true, force: true });
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 3.5.3: Create src/source/index.ts

**File:** `src/source/index.ts`
**Steps:**
- [ ] Barrel export `SourceParserImpl` and `GitClientImpl`

**BEFORE:** No file exists.

**AFTER:**
```typescript
export { SourceParserImpl } from './parser.js';
export { GitClientImpl } from './git.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 3.6: Tests (0.5 days)

### Task 3.6.1: Create test fixture cognitive files

**Directory:** `tests/fixtures/cognitives/`
**Steps:**
- [ ] Create `skills/react-best-practices/SKILL.md` with valid frontmatter (name, description, category, tags)
- [ ] Create `prompts/code-review/PROMPT.md` with valid frontmatter
- [ ] Create `rules/no-console/RULE.md` with valid frontmatter
- [ ] Create `agents/testing-agent/AGENT.md` with valid frontmatter
- [ ] Create `skills/missing-name/SKILL.md` with missing name field (for error testing)
- [ ] Create `skills/bad-frontmatter/SKILL.md` with invalid YAML frontmatter

**BEFORE:** No files exist.

**AFTER (example `skills/react-best-practices/SKILL.md`):**
```markdown
---
name: react-best-practices
description: Best practices for React development
category: frontend
tags:
  - react
  - frontend
  - typescript
author: test-author
version: 1.0.0
---

# React Best Practices

Use functional components with hooks...
```

**Verification:**
```bash
ls tests/fixtures/cognitives/skills/ tests/fixtures/cognitives/prompts/ tests/fixtures/cognitives/rules/
```

---

### Task 3.6.2: Create tests/discovery/scanner.test.ts

**File:** `tests/discovery/scanner.test.ts`
**Steps:**
- [ ] Test scanner discovers `SKILL.md` in `skills/<name>/` directories
- [ ] Test scanner discovers `PROMPT.md` in `prompts/<name>/` directories
- [ ] Test scanner discovers all 4 types when no filter is specified
- [ ] Test scanner respects `types` filter option
- [ ] Test scanner skips `node_modules` and hidden directories
- [ ] Test scanner works with `InMemoryFileSystem` seeded with test data
- [ ] Test scanner deduplicates results

**Verification:**
```bash
pnpm vitest run tests/discovery/scanner.test.ts
```

---

### Task 3.6.3: Create tests/discovery/parser.test.ts

**File:** `tests/discovery/parser.test.ts`
**Steps:**
- [ ] Test parser extracts name from frontmatter
- [ ] Test parser extracts description from frontmatter
- [ ] Test parser falls back to directory name when name is missing
- [ ] Test parser falls back to first content line when description is missing
- [ ] Test parser returns complete `Cognitive` object with all fields
- [ ] Test parser throws `ParseError` for invalid YAML frontmatter
- [ ] Test parser stores all frontmatter keys in `metadata`

**Verification:**
```bash
pnpm vitest run tests/discovery/parser.test.ts
```

---

### Task 3.6.4: Create tests/source/parser.test.ts

**File:** `tests/source/parser.test.ts`
**Steps:**
- [ ] Test all 12 resolution patterns:
  - [ ] `./my-skills` -> `kind: 'local'`
  - [ ] `/absolute/path` -> `kind: 'local'`
  - [ ] `https://docs.example.com/SKILL.md` -> `kind: 'direct-url'`
  - [ ] `https://github.com/owner/repo/tree/main/path` -> `kind: 'github'`, ref: `'main'`, subpath: `'path'`
  - [ ] `https://github.com/owner/repo/tree/main` -> `kind: 'github'`, ref: `'main'`
  - [ ] `https://github.com/owner/repo` -> `kind: 'github'`
  - [ ] `https://gitlab.com/group/repo/-/tree/main/path` -> `kind: 'gitlab'`
  - [ ] `https://gitlab.com/group/repo` -> `kind: 'gitlab'`
  - [ ] `owner/repo@skill-name` -> `kind: 'github'`, nameFilter: `'skill-name'`
  - [ ] `owner/repo` -> `kind: 'github'`
  - [ ] `owner/repo/subpath` -> `kind: 'github'`, subpath: `'subpath'`
  - [ ] `https://example.com` -> `kind: 'well-known'`
  - [ ] `git@github.com:owner/repo.git` -> `kind: 'git'`
- [ ] Test `getOwnerRepo()` extraction
- [ ] Test edge cases: trailing slashes, extra whitespace, case sensitivity

**Verification:**
```bash
pnpm vitest run tests/source/parser.test.ts
```

---

### Task 3.6.5: Create tests/discovery/integration.test.ts

**File:** `tests/discovery/integration.test.ts`
**Steps:**
- [ ] Test full discovery pipeline with `InMemoryFileSystem`
- [ ] Seed filesystem with 3 skills, 2 prompts, 1 rule
- [ ] Test `discover()` returns all 6 cognitives
- [ ] Test `discoverByType('skill')` returns only 3
- [ ] Test filter by name pattern
- [ ] Test filter by tags
- [ ] Test events are emitted correctly using `createCapturingEventBus()`

**Verification:**
```bash
pnpm vitest run tests/discovery/integration.test.ts
```

---

## Definition of Done

- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm vitest run tests/discovery/` passes all scanner, parser, and integration tests
- [ ] `pnpm vitest run tests/source/` passes all source parser tests
- [ ] `CognitiveScanner` discovers files using `FileSystemAdapter` (no direct `fs` imports)
- [ ] `CognitiveParser` extracts frontmatter using `gray-matter` and returns `Cognitive` objects
- [ ] `CognitiveFilter` correctly filters by type, name, tags, category
- [ ] `CognitiveValidator` rejects cognitives with missing required fields
- [ ] `DiscoveryServiceImpl` coordinates scan -> parse -> filter -> validate and emits events
- [ ] `SourceParserImpl` correctly resolves all 12 input patterns
- [ ] `GitClientImpl` compiles and wraps `simple-git` (runtime git testing deferred)
- [ ] All tests use `InMemoryFileSystem`, not the real filesystem

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `gray-matter` parses non-YAML frontmatter unexpectedly | Low | Medium | Pin `gray-matter` version, add regression tests |
| Source parser regex mismatches edge-case URLs | Medium | Medium | Comprehensive test suite with real-world URLs |
| Git clone timeout too aggressive on slow connections | Medium | Low | Make timeout configurable, default 30s is generous |
| Scanner too slow on large directories | Low | Medium | Limit max depth, skip node_modules early |
| Frontmatter extraction misses metadata | Medium | Low | Store all frontmatter keys in `metadata` as fallback |

---

## Rollback Strategy

If this sprint fails:
1. `src/discovery/` and `src/source/` directories can be deleted without affecting Sprints 1-2
2. No modifications to Layer 0 (types) or Layer 1 (config, events) code
3. `gray-matter` and `simple-git` dependencies can be removed from `package.json`
4. Test fixtures can be deleted independently
5. The `DiscoveryService` and `SourceParser` interfaces in `types/` remain stable regardless
