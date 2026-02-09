# Sprint 2: Core Systems

**Duration:** 5 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 complete (types + errors compile cleanly)
**Goal:** Implement the four Layer 1-2 systems: Config resolution, typed EventBus, FileSystem adapter (Node + InMemory), and the Agent registry with YAML-compiled definitions. At the end of this sprint, the SDK can resolve configuration, emit typed events, read/write an in-memory filesystem, and detect 39+ agents.

---

## Phase 2.1: Config System (1.5 days)

### Task 2.1.1: Create src/config/defaults.ts

**File:** `src/config/defaults.ts`
**Steps:**
- [ ] Define `DEFAULT_AGENTS_DIR` as `'.agents'`
- [ ] Define `DEFAULT_LOCK_FILE_NAME` as `'.cognit-lock.json'`
- [ ] Define `DEFAULT_CLONE_TIMEOUT_MS` as `30_000`
- [ ] Define `DEFAULT_CLONE_DEPTH` as `1`
- [ ] Export all defaults as named constants

**BEFORE:** No file exists.

**AFTER:**
```typescript
export const DEFAULT_AGENTS_DIR = '.agents';
export const DEFAULT_LOCK_FILE_NAME = '.cognit-lock.json';
export const DEFAULT_CLONE_TIMEOUT_MS = 30_000;
export const DEFAULT_CLONE_DEPTH = 1;
export const DEFAULT_TELEMETRY_ENABLED = true;
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.1.2: Create src/config/validation.ts

**File:** `src/config/validation.ts`
**Steps:**
- [ ] Implement `validateConfig(config: SDKConfig): void` that throws `InvalidConfigError` on invalid fields
- [ ] Validate `agentsDir` is non-empty
- [ ] Validate `lockFileName` is non-empty and ends with `.json`
- [ ] Validate `git.cloneTimeoutMs` is positive
- [ ] Validate `git.depth` is positive integer

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { SDKConfig } from '../types/config.js';
import { InvalidConfigError } from '../errors/config.js';

export function validateConfig(config: SDKConfig): void {
  if (!config.agentsDir) {
    throw new InvalidConfigError('agentsDir', 'must be non-empty');
  }
  if (!config.lockFileName || !config.lockFileName.endsWith('.json')) {
    throw new InvalidConfigError('lockFileName', 'must be non-empty and end with .json');
  }
  if (config.git.cloneTimeoutMs <= 0) {
    throw new InvalidConfigError('git.cloneTimeoutMs', 'must be positive');
  }
  if (config.git.depth <= 0 || !Number.isInteger(config.git.depth)) {
    throw new InvalidConfigError('git.depth', 'must be a positive integer');
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.1.3: Create src/config/index.ts

**File:** `src/config/index.ts`
**Steps:**
- [ ] Implement `resolveConfig(partial?: Partial<SDKConfig>): SDKConfig`
- [ ] Merge user overrides with defaults using spread + nullish coalescing
- [ ] Default `fs` to `nodeFs` (from `src/fs/node.ts`, placeholder until Phase 2.3)
- [ ] Default `cwd` to `process.cwd()`
- [ ] Default `homeDir` to `os.homedir()`
- [ ] Call `validateConfig()` on the resolved config
- [ ] Implement `detectGitHubToken()` helper checking `GITHUB_TOKEN` and `GH_TOKEN` env vars
- [ ] Export `resolveConfig` and `validateConfig`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { homedir } from 'node:os';
import type { SDKConfig, FileSystemAdapter } from '../types/config.js';
import { validateConfig } from './validation.js';
import {
  DEFAULT_AGENTS_DIR,
  DEFAULT_LOCK_FILE_NAME,
  DEFAULT_CLONE_TIMEOUT_MS,
  DEFAULT_CLONE_DEPTH,
  DEFAULT_TELEMETRY_ENABLED,
} from './defaults.js';

function detectGitHubToken(): string | undefined {
  return process.env['GITHUB_TOKEN']?.trim() || process.env['GH_TOKEN']?.trim() || undefined;
}

export function resolveConfig(
  partial?: Partial<SDKConfig>,
  defaultFs?: FileSystemAdapter,
): SDKConfig {
  const config: SDKConfig = {
    agentsDir: partial?.agentsDir ?? DEFAULT_AGENTS_DIR,
    lockFileName: partial?.lockFileName ?? DEFAULT_LOCK_FILE_NAME,
    cwd: partial?.cwd ?? process.cwd(),
    homeDir: partial?.homeDir ?? homedir(),
    fs: partial?.fs ?? defaultFs!,
    git: {
      cloneTimeoutMs: partial?.git?.cloneTimeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
      depth: partial?.git?.depth ?? DEFAULT_CLONE_DEPTH,
    },
    providers: {
      githubToken: partial?.providers?.githubToken ?? detectGitHubToken(),
      custom: partial?.providers?.custom ?? [],
    },
    agents: {
      definitionsPath: partial?.agents?.definitionsPath,
      additional: partial?.agents?.additional ?? [],
    },
    telemetry: {
      enabled: partial?.telemetry?.enabled ?? DEFAULT_TELEMETRY_ENABLED,
      endpoint: partial?.telemetry?.endpoint,
    },
  };

  validateConfig(config);
  return config;
}

export { validateConfig } from './validation.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.1.4: Create CategoryRegistry

**File:** `src/config/categories.ts`
**Steps:**
- [ ] Define `CategoryRegistry` class with `get(slug)`, `getAll()`, `register(category)` methods
- [ ] Initialize with `DEFAULT_CATEGORIES` from types
- [ ] Include default categories: general, planning, qa, growth, frontend, backend, devops, security, data, mobile, infra

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { Category } from '../types/config.js';
import { DEFAULT_CATEGORIES } from '../types/config.js';

export class CategoryRegistry {
  private readonly categories = new Map<string, Category>();

  constructor() {
    for (const cat of Object.values(DEFAULT_CATEGORIES)) {
      this.categories.set(cat.slug, cat);
    }
  }

  get(slug: string): Category | undefined {
    return this.categories.get(slug);
  }

  getAll(): ReadonlyMap<string, Category> {
    return this.categories;
  }

  register(category: Category): void {
    this.categories.set(category.slug, category);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 2.2: Event System (1 day)

### Task 2.2.1: Create src/events/index.ts

**File:** `src/events/index.ts`
**Steps:**
- [ ] Implement `EventBusImpl` class implementing `EventBus` interface
- [ ] Use a `Map<string, Set<Function>>` for handler storage
- [ ] Implement `emit()` that calls all handlers for the event synchronously
- [ ] Implement `on()` that registers a handler and returns an `Unsubscribe` function
- [ ] Implement `once()` that wraps the handler to auto-unsubscribe after first call
- [ ] Implement `createCapturingEventBus()` for tests that records all emitted events

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { SDKEventMap, EventBus, Unsubscribe } from '../types/events.js';

type Handler = (payload: unknown) => void;

export class EventBusImpl implements EventBus {
  private readonly handlers = new Map<string, Set<Handler>>();

  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void {
    const set = this.handlers.get(event as string);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }

  on<K extends keyof SDKEventMap>(
    event: K,
    handler: (payload: SDKEventMap[K]) => void,
  ): Unsubscribe {
    const key = event as string;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    const set = this.handlers.get(key)!;
    const wrapped = handler as Handler;
    set.add(wrapped);
    return () => { set.delete(wrapped); };
  }

  once<K extends keyof SDKEventMap>(
    event: K,
    handler: (payload: SDKEventMap[K]) => void,
  ): Unsubscribe {
    const unsub = this.on(event, (payload) => {
      unsub();
      handler(payload);
    });
    return unsub;
  }
}

/** For tests: captures all emitted events in order */
export function createCapturingEventBus(): EventBus & {
  readonly events: Array<{ event: string; payload: unknown }>;
} {
  const events: Array<{ event: string; payload: unknown }> = [];
  const inner = new EventBusImpl();
  return {
    events,
    emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]) {
      events.push({ event: event as string, payload });
      inner.emit(event, payload);
    },
    on: inner.on.bind(inner),
    once: inner.once.bind(inner),
  };
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 2.3: FileSystem Adapter (1 day)

### Task 2.3.1: Create src/fs/node.ts

**File:** `src/fs/node.ts`
**Steps:**
- [ ] Implement `NodeFileSystem` class implementing `FileSystemAdapter`
- [ ] Wrap `fs/promises` methods: `readFile`, `writeFile`, `mkdir`, `readdir`, `stat`, `lstat`, `symlink`, `readlink`, `rm`, `rename`
- [ ] Implement `exists()` using `stat()` with try/catch for ENOENT
- [ ] Implement `copyDirectory()` using recursive readdir + mkdir + copy
- [ ] Export a singleton `nodeFs` instance

**BEFORE:** No file exists.

**AFTER:**
```typescript
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { FileSystemAdapter, FsStats, Dirent } from '../types/config.js';

export class NodeFileSystem implements FileSystemAdapter {
  async readFile(filePath: string, encoding: 'utf-8'): Promise<string> {
    return fsp.readFile(filePath, encoding);
  }

  async writeFile(filePath: string, content: string, encoding: 'utf-8'): Promise<void> {
    await fsp.writeFile(filePath, content, encoding);
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fsp.mkdir(dirPath, options);
  }

  async readdir(dirPath: string, options: { withFileTypes: true }): Promise<Dirent[]> {
    return fsp.readdir(dirPath, options) as Promise<Dirent[]>;
  }

  async stat(filePath: string): Promise<FsStats> {
    return fsp.stat(filePath);
  }

  async lstat(filePath: string): Promise<FsStats> {
    return fsp.lstat(filePath);
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    await fsp.symlink(target, linkPath);
  }

  async readlink(linkPath: string): Promise<string> {
    return fsp.readlink(linkPath);
  }

  async rm(filePath: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    await fsp.rm(filePath, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsp.rename(oldPath, newPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fsp.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async copyDirectory(source: string, target: string): Promise<void> {
    await fsp.mkdir(target, { recursive: true });
    const entries = await fsp.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fsp.copyFile(srcPath, destPath);
      }
    }
  }
}

export const nodeFs = new NodeFileSystem();
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.3.2: Create src/fs/memory.ts

**File:** `src/fs/memory.ts`
**Steps:**
- [ ] Implement `InMemoryFileSystem` class implementing `FileSystemAdapter`
- [ ] Use a `Map<string, string | Map>` tree structure for virtual filesystem
- [ ] Implement all 12 adapter methods against the in-memory tree
- [ ] Implement `createMemoryFs(seed?)` factory that pre-populates files from a `Record<string, string>`
- [ ] Support symlinks as special entries pointing to target paths

**BEFORE:** No file exists.

**AFTER:**
```typescript
import * as pathModule from 'node:path';
import type { FileSystemAdapter, FsStats, Dirent } from '../types/config.js';

interface FsNode {
  type: 'file' | 'dir' | 'symlink';
  content?: string;
  target?: string; // for symlinks
  children?: Map<string, FsNode>;
}

export class InMemoryFileSystem implements FileSystemAdapter {
  private root: FsNode = { type: 'dir', children: new Map() };

  private resolve(filePath: string): string {
    return pathModule.resolve(filePath);
  }

  private getNode(filePath: string): FsNode | undefined {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (current.type !== 'dir' || !current.children) return undefined;
      const next = current.children.get(part);
      if (!next) return undefined;
      current = next;
    }
    return current;
  }

  private ensureParent(filePath: string): FsNode {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    parts.pop(); // remove filename
    let current = this.root;
    for (const part of parts) {
      if (!current.children) current.children = new Map();
      if (!current.children.has(part)) {
        current.children.set(part, { type: 'dir', children: new Map() });
      }
      current = current.children.get(part)!;
    }
    return current;
  }

  async readFile(filePath: string, _encoding: 'utf-8'): Promise<string> {
    const node = this.getNode(filePath);
    if (!node || node.type !== 'file') throw new Error(`ENOENT: ${filePath}`);
    return node.content!;
  }

  async writeFile(filePath: string, content: string, _encoding: 'utf-8'): Promise<void> {
    const parent = this.ensureParent(filePath);
    const name = pathModule.basename(this.resolve(filePath));
    parent.children!.set(name, { type: 'file', content });
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolved = this.resolve(dirPath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children) current.children = new Map();
      if (!current.children.has(part)) {
        if (!options?.recursive) throw new Error(`ENOENT: ${dirPath}`);
        current.children.set(part, { type: 'dir', children: new Map() });
      }
      current = current.children.get(part)!;
    }
  }

  async readdir(_dirPath: string, _options: { withFileTypes: true }): Promise<Dirent[]> {
    const node = this.getNode(_dirPath);
    if (!node || node.type !== 'dir') throw new Error(`ENOTDIR: ${_dirPath}`);
    const entries: Dirent[] = [];
    for (const [name, child] of node.children ?? []) {
      entries.push({
        name,
        isFile: () => child.type === 'file',
        isDirectory: () => child.type === 'dir',
        isSymbolicLink: () => child.type === 'symlink',
      });
    }
    return entries;
  }

  async stat(filePath: string): Promise<FsStats> {
    const node = this.getNode(filePath);
    if (!node) throw new Error(`ENOENT: ${filePath}`);
    return {
      isFile: () => node.type === 'file',
      isDirectory: () => node.type === 'dir',
      isSymbolicLink: () => node.type === 'symlink',
    };
  }

  async lstat(filePath: string): Promise<FsStats> {
    return this.stat(filePath);
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    const parent = this.ensureParent(linkPath);
    const name = pathModule.basename(this.resolve(linkPath));
    parent.children!.set(name, { type: 'symlink', target });
  }

  async readlink(linkPath: string): Promise<string> {
    const node = this.getNode(linkPath);
    if (!node || node.type !== 'symlink') throw new Error(`EINVAL: ${linkPath}`);
    return node.target!;
  }

  async rm(filePath: string, _options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    const name = parts.pop()!;
    let current = this.root;
    for (const part of parts) {
      if (!current.children?.has(part)) {
        if (_options?.force) return;
        throw new Error(`ENOENT: ${filePath}`);
      }
      current = current.children.get(part)!;
    }
    current.children?.delete(name);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const node = this.getNode(oldPath);
    if (!node) throw new Error(`ENOENT: ${oldPath}`);
    await this.rm(oldPath);
    const parent = this.ensureParent(newPath);
    const name = pathModule.basename(this.resolve(newPath));
    parent.children!.set(name, node);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.getNode(filePath) !== undefined;
  }

  async copyDirectory(source: string, target: string): Promise<void> {
    const srcNode = this.getNode(source);
    if (!srcNode || srcNode.type !== 'dir') throw new Error(`ENOTDIR: ${source}`);
    await this.mkdir(target, { recursive: true });
    for (const [name, child] of srcNode.children ?? []) {
      const srcChild = pathModule.join(source, name);
      const destChild = pathModule.join(target, name);
      if (child.type === 'dir') {
        await this.copyDirectory(srcChild, destChild);
      } else if (child.type === 'file') {
        await this.writeFile(destChild, child.content!, 'utf-8');
      }
    }
  }
}

/** Factory: create a pre-seeded in-memory filesystem */
export function createMemoryFs(seed?: Record<string, string>): FileSystemAdapter {
  const fs = new InMemoryFileSystem();
  if (seed) {
    for (const [filePath, content] of Object.entries(seed)) {
      // Synchronous-ish: these are all sync operations on in-memory data
      void fs.writeFile(filePath, content, 'utf-8');
    }
  }
  return fs;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.3.3: Create src/fs/index.ts

**File:** `src/fs/index.ts`
**Steps:**
- [ ] Re-export `nodeFs` from `node.ts`
- [ ] Re-export `createMemoryFs` from `memory.ts`
- [ ] Re-export `FileSystemAdapter` type from types

**BEFORE:** No file exists.

**AFTER:**
```typescript
export { nodeFs, NodeFileSystem } from './node.js';
export { createMemoryFs, InMemoryFileSystem } from './memory.js';
export type { FileSystemAdapter, FsStats, Dirent } from '../types/config.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 2.4: Agent System (1 day)

### Task 2.4.1: Create YAML agent definitions

**Directory:** `agents/`
**Steps:**
- [ ] Create at minimum 39 YAML files, one per agent
- [ ] Required agents: `claude-code`, `cursor`, `codex`, `windsurf`, `github-copilot`, `aider`, `cline`, `continue`, `zed`, `bolt`, `lovable`, `replit`, `devin`, `gemini-cli`, `opencode`, `amp`, `roo`, `goose`, `junie`, `kiro-cli`, `augment`, `trae`, `adal`, `mcpjam`, `kode`, `crush`, `pochi`, `qoder`, `zencoder`, `supermaven`, `tabnine`, `cody`, `double`, `void`, `sourcegraph`, `mentat`, `sweep`, `grit`, `duo`
- [ ] Each YAML follows the schema from 04-agent-system.md with `name`, `displayName`, and either `rootDir` or `localRoot`/`globalRoot`
- [ ] Include detection rules per agent

**BEFORE:** No directory or files exist.

**AFTER (example `agents/claude-code.yaml`):**
```yaml
name: claude-code
displayName: Claude Code
rootDir: .claude
globalRoot: ${CLAUDE_CONFIG_DIR:~/.claude}
detect:
  - envResolved: claudeHome
```

**AFTER (example `agents/cursor.yaml`):**
```yaml
name: cursor
displayName: Cursor
rootDir: .cursor
```

**AFTER (example `agents/codex.yaml`):**
```yaml
name: codex
displayName: Codex
localRoot: .agents
globalRoot: ${CODEX_HOME:~/.codex}
detect:
  - envResolved: codexHome
```

**Verification:**
```bash
ls agents/*.yaml | wc -l  # Should be >= 39
```

---

### Task 2.4.2: Create scripts/compile-agents.ts

**File:** `scripts/compile-agents.ts`
**Steps:**
- [ ] Load all `agents/*.yaml` files
- [ ] Load `config/cognitive-types.yaml`
- [ ] Validate: required fields, name matches filename, no duplicates
- [ ] Resolve conventions: `rootDir` expands to `localRoot`, `globalRoot`, `detect`
- [ ] Generate `src/agents/__generated__/agent-type.ts` with `AgentType` union
- [ ] Generate `src/agents/__generated__/cognitive-types.ts` with `CognitiveType` union + const maps
- [ ] Generate `src/agents/__generated__/agents.ts` with complete `Record<AgentType, AgentConfig>`
- [ ] Each generated file has `// AUTO-GENERATED -- DO NOT EDIT` header
- [ ] Generated files import only from `node:os`, `node:path`, `node:fs`, `xdg-basedir`

**BEFORE:** No file exists.

**AFTER (signature):**
```typescript
#!/usr/bin/env tsx
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import YAML from 'yaml';

interface AgentYaml {
  name: string;
  displayName: string;
  rootDir?: string;
  localRoot?: string;
  globalRoot?: string | { firstExists: string[] };
  detect?: DetectRule[];
  showInUniversalList?: boolean;
}

type DetectRule =
  | { homeDir: string }
  | { xdgConfig: string }
  | { cwdDir: string }
  | { absolutePath: string }
  | { envVar: string }
  | { envResolved: string }
  | { envResolvedPath: { var: string; subpath: string } };

// Phase 1: Load and validate
// Phase 2: Resolve conventions
// Phase 3: Generate TypeScript files

main();
```

**Verification:**
```bash
pnpm tsx scripts/compile-agents.ts
pnpm tsc --noEmit
```

---

### Task 2.4.3: Create src/agents/registry.ts and src/agents/detector.ts

**File:** `src/agents/registry.ts`
**Steps:**
- [ ] Implement `AgentRegistryImpl` class implementing `AgentRegistry` interface
- [ ] Constructor accepts `SDKConfig` and `EventBus`
- [ ] Load generated agents from `__generated__/agents.ts` into internal `Map<AgentType, AgentConfig>`
- [ ] Register any `config.agents.additional` at construction time
- [ ] Implement `getAll()`, `get()`, `getUniversalAgents()`, `getNonUniversalAgents()`, `isUniversal()`, `getDir()`
- [ ] Implement `register()` for runtime registration, reject duplicates

**File:** `src/agents/detector.ts`
**Steps:**
- [ ] Implement `AgentDetectorImpl` with `detectInstalled()` method
- [ ] Run all agent `detectInstalled()` functions in parallel using `Promise.allSettled()`
- [ ] Emit `agent:detect:start`, `agent:detect:found`, `agent:detect:complete` events

**BEFORE:** No files exist.

**AFTER (registry.ts signature):**
```typescript
import type { AgentType, AgentConfig, AgentRegistry, AgentDetectionResult } from '../types/agent.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import { AGENTS_DIR } from '../types/cognitive.js';

export class AgentRegistryImpl implements AgentRegistry {
  private readonly agents: Map<AgentType, AgentConfig>;

  constructor(
    private readonly config: SDKConfig,
    private readonly eventBus: EventBus,
  ) {
    this.agents = new Map(/* load from __generated__ */);
    for (const additional of config.agents.additional) {
      this.register(additional);
    }
  }

  getAll(): ReadonlyMap<AgentType, AgentConfig> { /* ... */ }
  get(type: AgentType): AgentConfig | undefined { /* ... */ }
  getUniversalAgents(cognitiveType?: CognitiveType): AgentType[] { /* ... */ }
  getNonUniversalAgents(cognitiveType?: CognitiveType): AgentType[] { /* ... */ }
  isUniversal(type: AgentType, cognitiveType?: CognitiveType): boolean { /* ... */ }
  getDir(type: AgentType, cognitiveType: CognitiveType, scope: 'local' | 'global'): string | undefined { /* ... */ }
  async detectInstalled(): Promise<AgentDetectionResult[]> { /* ... */ }
  register(config: AgentConfig): void { /* ... */ }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 2.4.4: Create src/agents/index.ts

**File:** `src/agents/index.ts`
**Steps:**
- [ ] Barrel export `AgentRegistryImpl`
- [ ] Re-export `AgentRegistry` interface from types

**BEFORE:** No file exists.

**AFTER:**
```typescript
export { AgentRegistryImpl } from './registry.js';
export type { AgentRegistry } from '../types/agent.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 2.5: Tests (0.5 days)

### Task 2.5.1: Create tests/config/resolve-config.test.ts

**File:** `tests/config/resolve-config.test.ts`
**Steps:**
- [ ] Test `resolveConfig()` with no arguments applies all defaults
- [ ] Test partial override: only `cwd` changes, rest is defaults
- [ ] Test nested override: `git.depth` changes, `git.cloneTimeoutMs` stays default
- [ ] Test `validateConfig()` throws on empty `agentsDir`
- [ ] Test `validateConfig()` throws on non-JSON `lockFileName`
- [ ] Test `validateConfig()` throws on negative `cloneTimeoutMs`

**Verification:**
```bash
pnpm vitest run tests/config/
```

---

### Task 2.5.2: Create tests/events/event-bus.test.ts

**File:** `tests/events/event-bus.test.ts`
**Steps:**
- [ ] Test `on()` + `emit()`: handler receives correct payload
- [ ] Test multiple handlers: both called in registration order
- [ ] Test `once()`: handler fires exactly once
- [ ] Test unsubscribe removes handler
- [ ] Test `createCapturingEventBus()` records events in order
- [ ] Test emitting unknown event does not throw

**Verification:**
```bash
pnpm vitest run tests/events/
```

---

### Task 2.5.3: Create tests/fs/memory.test.ts

**File:** `tests/fs/memory.test.ts`
**Steps:**
- [ ] Test `writeFile` + `readFile` roundtrip
- [ ] Test `mkdir` with `recursive: true` creates nested directories
- [ ] Test `readdir` returns correct entries with `withFileTypes`
- [ ] Test `exists` returns true for existing files, false for missing
- [ ] Test `symlink` + `readlink` roundtrip
- [ ] Test `rm` removes files and directories
- [ ] Test `copyDirectory` copies all files recursively
- [ ] Test `createMemoryFs(seed)` populates files from seed object

**Verification:**
```bash
pnpm vitest run tests/fs/
```

---

### Task 2.5.4: Create tests/agents/registry.test.ts

**File:** `tests/agents/registry.test.ts`
**Steps:**
- [ ] Test `getAll()` returns non-empty map
- [ ] Test `get('claude-code')` returns valid config
- [ ] Test `get('nonexistent')` returns undefined
- [ ] Test `getUniversalAgents()` returns agents with `.agents` as localRoot
- [ ] Test `getNonUniversalAgents()` returns agents like `cursor` with `.cursor` as localRoot
- [ ] Test `isUniversal('codex')` returns true
- [ ] Test `isUniversal('cursor')` returns false
- [ ] Test `register()` adds a new agent
- [ ] Test `register()` with duplicate name throws

**Verification:**
```bash
pnpm vitest run tests/agents/
```

---

## Definition of Done

- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm vitest run` passes all tests (config, events, fs, agents)
- [ ] `resolveConfig()` correctly merges partial configs with defaults
- [ ] `EventBusImpl` emits typed events with correct payloads
- [ ] `InMemoryFileSystem` passes all filesystem operation tests
- [ ] `NodeFileSystem` compiles (runtime testing deferred to integration)
- [ ] `scripts/compile-agents.ts` generates 3 output files from 39+ YAML inputs
- [ ] Generated `AgentType` union includes all 39+ agent identifiers
- [ ] `AgentRegistryImpl` loads generated agents and supports runtime registration
- [ ] `CategoryRegistry` initializes with 11 default categories

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent YAML schema changes during development | Medium | Medium | Keep schema simple, add optional fields later |
| `xdg-basedir` package may not resolve on all platforms | Low | Medium | Provide fallback to `~/.config` |
| InMemoryFileSystem edge cases (path normalization) | Medium | Low | Test on both POSIX and Windows path formats |
| Compile script fails on edge-case YAML syntax | Low | Low | Add schema validation with clear error messages |
| Generated code gets too large (39+ agents) | Low | Low | Code generation is straightforward; file size is manageable |

---

## Rollback Strategy

If this sprint fails:
1. `src/config/`, `src/events/`, `src/fs/`, `src/agents/` directories can be deleted independently
2. Sprint 1 types remain intact -- no modifications to Layer 0
3. `scripts/compile-agents.ts` and `agents/*.yaml` can be regenerated
4. No external consumers depend on these modules yet
5. All generated files under `__generated__/` can be re-created by running the compile script
