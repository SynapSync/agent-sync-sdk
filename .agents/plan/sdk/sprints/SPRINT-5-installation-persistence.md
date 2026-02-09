# Sprint 5: Installation & Persistence

**Duration:** 7 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 (types, errors), Sprint 2 (config, events, filesystem adapter)
**Layer:** 4 (Installer & Lock)

---

## Sprint Goal

Build the two critical persistence systems: the **Installer** (places cognitives onto the filesystem via symlink or copy) and the **Lock System** (tracks every installed cognitive's metadata, source, integrity hash, and timestamps). These systems underpin all 8 operations built in Sprint 6.

---

## Phase 5.1: Installer Service (2 days)

### Task 5.1.1: Core Installer Implementation

**File:** `src/installer/service.ts`

Implement `InstallerImpl` that receives dependencies through constructor injection and exposes three install variants plus uninstall.

- [ ] Define `InstallerImpl` class implementing `Installer` interface from `src/types/installer.ts`
- [ ] Inject `AgentRegistry`, `FileOperations`, `EventBus` via constructor
- [ ] Implement `installFromDirectory(sourcePath, name, options)` -- copies from a local directory source
- [ ] Implement `installFromContent(content, name, options)` -- writes raw content (e.g., fetched from provider)
- [ ] Implement `installFromFiles(files, name, options)` -- writes multiple files (e.g., well-known provider)
- [ ] Implement `uninstall(name, cognitiveType, options)` -- removes agent symlinks and canonical directory
- [ ] Implement `isInstalled(name, agent, cognitiveType, options)` -- checks installation status
- [ ] All methods return `Result<InstallResult, InstallError>` or `Result<UninstallResult, InstallError>`
- [ ] Emit events: `install:start`, `install:symlink`, `install:copy`, `install:complete` at each step
- [ ] Support `dryRun` option -- report actions without executing

```typescript
// src/installer/service.ts
import type { Installer, InstallOptions, InstallResult, UninstallResult, InstallAction } from '../types/installer.js';
import type { AgentRegistry, AgentType } from '../types/agent.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { EventBus } from '../types/events.js';
import type { Result } from '../types/result.js';
import type { FileOperations } from './file-ops.js';

export class InstallerImpl implements Installer {
  private readonly agents: AgentRegistry;
  private readonly fileOps: FileOperations;
  private readonly eventBus: EventBus;

  constructor(agents: AgentRegistry, fileOps: FileOperations, eventBus: EventBus) {
    this.agents = agents;
    this.fileOps = fileOps;
    this.eventBus = eventBus;
  }

  async installFromDirectory(
    sourcePath: string,
    name: string,
    options: Partial<InstallOptions>,
  ): Promise<Result<InstallResult, InstallError>> {
    const actions: InstallAction[] = [];
    try {
      const resolvedOpts = this.resolveOptions(options);
      const canonicalPath = getCanonicalPath(resolvedOpts.cognitiveType, resolvedOpts.category, name, resolvedOpts.scope, resolvedOpts.projectRoot);

      this.eventBus.emit('install:start', { cognitive: name, agent: '', mode: resolvedOpts.mode });

      // 1. Write to canonical location
      await this.fileOps.cleanAndCreate(canonicalPath);
      actions.push({ type: 'create_directory', path: canonicalPath });
      await this.fileOps.copyDirectory(sourcePath, canonicalPath);
      actions.push({ type: 'copy_directory', path: canonicalPath, target: sourcePath });

      // 2. Create symlinks/copies per agent
      const agentResults = await this.installToAgents(canonicalPath, name, resolvedOpts, actions);

      return { ok: true, value: { success: true, canonicalPath, agentResults, mode: resolvedOpts.mode, errors: [], actions } };
    } catch (error) {
      await this.rollback(actions);
      return { ok: false, error: new InstallError('UNKNOWN', `Install failed: ${String(error)}`) };
    }
  }

  async uninstall(
    name: string,
    cognitiveType: CognitiveType,
    options: { scope: InstallScope; projectRoot?: string },
  ): Promise<Result<UninstallResult, InstallError>> {
    // Remove agent symlinks, then canonical directory
    // ...
  }
}
```

### Task 5.1.2: Symlink Mode

**File:** `src/installer/symlink.ts`

- [ ] Implement `createSymlink(target, linkPath)` with ELOOP detection
- [ ] Implement `verifySymlink(linkPath)` -- checks target exists
- [ ] Implement `detectEloop(linkPath)` -- catches circular symlinks
- [ ] Resolve both source and target through `realpath()` before creating symlink
- [ ] If resolved paths are identical, skip symlink creation (return success)
- [ ] Handle existing entry at link path: if symlink, check target; if directory, remove
- [ ] Compute relative symlink path from `dirname(linkPath)` to target
- [ ] On Windows: pass `'junction'` to `fs.symlink()` for directory junctions
- [ ] On failure: return structured error (ELOOP, EPERM, etc.) for fallback logic

```typescript
// src/installer/symlink.ts
import type { FileSystemAdapter } from '../types/config.js';

export async function createSymlink(
  target: string,
  linkPath: string,
  fs: FileSystemAdapter,
): Promise<boolean> {
  const resolvedTarget = resolve(target);
  const resolvedLinkPath = resolve(linkPath);

  // Skip if paths resolve to same location (universal agent)
  if (resolvedTarget === resolvedLinkPath) return true;

  // Check with parent symlinks resolved
  const realTarget = await resolveParentSymlinks(target, fs);
  const realLinkPath = await resolveParentSymlinks(linkPath, fs);
  if (realTarget === realLinkPath) return true;

  // Handle existing entry at link path
  try {
    const stats = await fs.lstat(linkPath);
    if (stats.isSymbolicLink()) {
      const existingTarget = await fs.readlink(linkPath);
      if (resolve(dirname(linkPath), existingTarget) === resolvedTarget) return true;
      await fs.rm(linkPath);
    } else {
      await fs.rm(linkPath, { recursive: true });
    }
  } catch (err: unknown) {
    if (isErrnoException(err) && err.code === 'ELOOP') {
      await fs.rm(linkPath, { force: true });
    }
    // ENOENT expected -- link does not exist yet
  }

  // Create parent directory
  await fs.mkdir(dirname(linkPath), { recursive: true });

  // Compute relative path and create
  const realLinkDir = await resolveParentSymlinks(dirname(linkPath), fs);
  const relativePath = relative(realLinkDir, target);
  const symlinkType = platform() === 'win32' ? 'junction' : undefined;

  await fs.symlink(relativePath, linkPath, symlinkType);
  return true;
}
```

### Task 5.1.3: Copy Mode

**File:** `src/installer/copy.ts`

- [ ] Implement `deepCopy(source, dest, fs)` -- recursive directory copy
- [ ] Implement `atomicCopy(source, dest, fs)` -- copy to temp then rename
- [ ] Filter excluded files: `README.md`, `metadata.json`, `.git/`, files starting with `_`
- [ ] Dereference symlinks during copy (`dereference: true`)
- [ ] Parallel copy of directory entries using `Promise.all`
- [ ] Two modes: symlink (default, preferred) and copy (fallback when symlinks unavailable)

```typescript
// src/installer/copy.ts
export async function deepCopy(
  src: string,
  dest: string,
  fs: FileSystemAdapter,
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(entry => !isExcluded(entry.name, entry.isDirectory()))
      .map(async entry => {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
          await deepCopy(srcPath, destPath, fs);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }),
  );
}

function isExcluded(name: string, isDir: boolean): boolean {
  if (name.startsWith('_')) return true;
  if (isDir && name === '.git') return true;
  if (name === 'README.md' || name === 'metadata.json') return true;
  return false;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 5.2: Path Resolution (1.5 days)

### Task 5.2.1: Canonical Path Resolution

**File:** `src/installer/paths.ts`

- [ ] Implement `getCanonicalPath(cognitiveType, category, name, scope, projectRoot)` -- returns `.agents/cognit/<type>/<category>/<name>/`
- [ ] Implement `getAgentPath(agent, cognitiveType, name, scope, projectRoot)` -- returns flattened `.<agent>/<type>/<name>/` (no category)
- [ ] Implement `findProjectRoot(startDir)` -- walks up looking for `.agents/cognit`, `.git`, `package.json`
- [ ] Implement `getGlobalBase()` -- XDG on Linux (`${XDG_DATA_HOME}/cognit/`), `~/.agents/cognit/` on macOS, `%APPDATA%\cognit\` on Windows
- [ ] Use `COGNITIVE_SUBDIRS` const map for type-to-directory mapping (`skill` -> `skills`, `prompt` -> `prompts`, etc.)

```typescript
// src/installer/paths.ts
import { resolve, parse, dirname, join } from 'node:path';
import { homedir, platform } from 'node:os';

const COGNITIVE_SUBDIRS: Record<CognitiveType, string> = {
  skill: 'skills',
  prompt: 'prompts',
  rule: 'rules',
  agent: 'agents',
} as const;

export function getCanonicalPath(
  cognitiveType: CognitiveType,
  category: string,
  name: string,
  scope: InstallScope,
  projectRoot?: string,
): string {
  const base = scope === 'global'
    ? getGlobalBase()
    : join(projectRoot ?? process.cwd(), '.agents', 'cognit');

  const typeSubdir = COGNITIVE_SUBDIRS[cognitiveType];
  const safeName = sanitizeName(name);
  const safeCategory = sanitizeName(category);

  return join(base, typeSubdir, safeCategory, safeName);
}

export function getAgentPath(
  agent: AgentType,
  cognitiveType: CognitiveType,
  name: string,
  scope: InstallScope,
  agentRegistry: AgentRegistry,
  projectRoot?: string,
): string {
  const agentConfig = agentRegistry.get(agent);
  const dirs = agentConfig.dirs[cognitiveType];
  const base = scope === 'global'
    ? dirs.global
    : join(projectRoot ?? process.cwd(), dirs.local);
  return join(base, sanitizeName(name));
}

export async function findProjectRoot(startDir: string, fs: FileSystemAdapter): Promise<string> {
  let dir = resolve(startDir);
  const root = parse(dir).root;

  while (dir !== root) {
    if (await fs.exists(join(dir, '.agents', 'cognit'))) return dir;
    if (await fs.exists(join(dir, '.git'))) return dir;
    if (await fs.exists(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }

  return startDir;
}

export function getGlobalBase(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'cognit');
  }
  if (process.platform === 'linux') {
    const xdgData = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');
    return join(xdgData, 'cognit');
  }
  // macOS and others
  return join(homedir(), '.agents', 'cognit');
}
```

### Task 5.2.2: Agent-Specific Flattening

**File:** `src/installer/flatten.ts`

- [ ] Implement category flattening logic: canonical has categories, agent dirs flatten
- [ ] When installing to non-universal agent: symlink from `.<agent>/<type>/<name>/` to `.agents/cognit/<type>/<category>/<name>/`
- [ ] When installing to universal agent (`.agents` localRoot): skip symlink -- canonical IS the agent path
- [ ] Handle name collision detection: warn when same name exists in different categories for same agent

### Task 5.2.3: Security Validation

**File:** `src/installer/security.ts`

- [ ] Implement `isPathSafe(basePath, targetPath)` -- ensures target stays within base
- [ ] Implement `sanitizeName(name)` -- kebab-case, alphanumeric + hyphens, max 255 chars
- [ ] Implement `validateInstallPaths(canonical, agentPaths)` -- batch validation before any writes
- [ ] Reject names containing `../`, `./`, `/`, `\`, or null bytes
- [ ] Strip leading/trailing dots and hyphens
- [ ] Fallback to `'unnamed-cognitive'` if sanitization produces empty string

```typescript
// src/installer/security.ts
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '-')
    .replace(/^[.\-]+|[.\-]+$/g, '')
    .substring(0, 255)
    || 'unnamed-cognitive';
}

export function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath));
  const normalizedTarget = normalize(resolve(targetPath));
  return (
    normalizedTarget.startsWith(normalizedBase + sep) ||
    normalizedTarget === normalizedBase
  );
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 5.3: Atomic Operations (0.5 days)

### Task 5.3.1: Atomic Write Pattern

**File:** `src/installer/atomic.ts`

- [ ] Implement `atomicWriteFile(targetPath, content, fs)` -- temp-file-then-rename pattern
- [ ] Use `process.pid` suffix for temp file naming to avoid collisions
- [ ] Clean up temp file on failure
- [ ] Ensure parent directory exists before writing

```typescript
// src/installer/atomic.ts
export async function atomicWriteFile(
  targetPath: string,
  content: string,
  fs: FileSystemAdapter,
): Promise<void> {
  const tempPath = targetPath + '.tmp.' + process.pid;
  try {
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    try { await fs.rm(tempPath, { force: true }); } catch { /* best effort */ }
    throw error;
  }
}
```

### Task 5.3.2: Rollback Engine

**File:** `src/installer/rollback.ts`

- [ ] Implement `rollback(actions)` -- reverses `InstallAction[]` in LIFO order
- [ ] Track action types: `create_directory`, `write_file`, `create_symlink`, `copy_file`, `copy_directory`, `remove_existing`
- [ ] For `remove_existing`: restore from backup path if available
- [ ] Best-effort rollback: catch and log errors per action, continue to next
- [ ] Return rollback report: which actions were undone, which failed

```typescript
// src/installer/rollback.ts
import type { InstallAction } from '../types/installer.js';
import type { FileSystemAdapter } from '../types/config.js';

export async function rollback(
  actions: InstallAction[],
  fs: FileSystemAdapter,
): Promise<{ undone: number; failed: number }> {
  let undone = 0;
  let failed = 0;

  for (const action of actions.reverse()) {
    try {
      switch (action.type) {
        case 'create_directory':
        case 'copy_directory':
          await fs.rm(action.path, { recursive: true, force: true });
          break;
        case 'write_file':
        case 'copy_file':
        case 'create_symlink':
          await fs.rm(action.path, { force: true });
          break;
        case 'remove_existing':
          if (action.backupPath) {
            await fs.rename(action.backupPath, action.path);
          }
          break;
      }
      undone++;
    } catch {
      failed++;
    }
  }

  return { undone, failed };
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 5.4: Lock System (2.5 days)

### Task 5.4.1: Lock File Manager

**File:** `src/lock/manager.ts`

- [ ] Implement `LockFileManagerImpl` with all CRUD operations
- [ ] Inject `SDKConfig`, `FileOperations`, `EventBus` via constructor
- [ ] `read(scope, projectRoot)` -- read and parse lock file, migrate if needed, return empty if missing
- [ ] `write(lock, scope, projectRoot)` -- atomic write via temp+rename
- [ ] `upsert(key, entry, scope, projectRoot)` -- read-modify-write pattern
- [ ] `remove(key, scope, projectRoot)` -- remove entry, returns true if existed
- [ ] `get(key, scope, projectRoot)` -- single entry lookup
- [ ] `getAll(scope, projectRoot)` -- all entries as Record
- [ ] `query(filter, scope, projectRoot)` -- filtered query by type, category, source, agent, date range
- [ ] `getBySource(scope, projectRoot)` -- group entries by source identifier
- [ ] `getLockFilePath(scope, projectRoot)` -- resolve `.cognit-lock.json` path
- [ ] `exists(scope, projectRoot)` -- check if lock file exists
- [ ] Emit events: `lock:read`, `lock:write`, `lock:migrate`

```typescript
// src/lock/manager.ts
import type { LockFileManager, CognitLockFile, CognitLockEntry, LockQueryFilter } from '../types/lock.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { InstallScope } from '../types/installer.js';

export class LockFileManagerImpl implements LockFileManager {
  constructor(
    private readonly config: SDKConfig,
    private readonly fileOps: FileOperations,
    private readonly eventBus: EventBus,
  ) {}

  async read(scope: InstallScope, projectRoot?: string): Promise<CognitLockFile> {
    const lockPath = this.getLockFilePath(scope, projectRoot);
    this.eventBus.emit('lock:read', { path: lockPath });

    try {
      const raw = await this.fileOps.readFile(lockPath);
      const parsed = JSON.parse(raw);
      return readWithMigration(parsed, this.eventBus);
    } catch {
      return createEmptyLockFile();
    }
  }

  async write(lock: CognitLockFile, scope: InstallScope, projectRoot?: string): Promise<void> {
    const lockPath = this.getLockFilePath(scope, projectRoot);
    lock.metadata.updatedAt = new Date().toISOString();
    await writeLockFileAtomic(lockPath, lock, this.fileOps);
    this.eventBus.emit('lock:write', { path: lockPath, entryCount: Object.keys(lock.entries).length });
  }

  async upsert(key: string, entry: CognitLockEntry, scope: InstallScope, projectRoot?: string): Promise<void> {
    const lock = await this.read(scope, projectRoot);
    lock.entries[key] = entry;
    await this.write(lock, scope, projectRoot);
  }

  async remove(key: string, scope: InstallScope, projectRoot?: string): Promise<boolean> {
    const lock = await this.read(scope, projectRoot);
    if (!(key in lock.entries)) return false;
    delete lock.entries[key];
    await this.write(lock, scope, projectRoot);
    return true;
  }

  async get(key: string, scope: InstallScope, projectRoot?: string): Promise<CognitLockEntry | null> {
    const lock = await this.read(scope, projectRoot);
    return lock.entries[key] ?? null;
  }

  async getAll(scope: InstallScope, projectRoot?: string): Promise<Record<string, CognitLockEntry>> {
    const lock = await this.read(scope, projectRoot);
    return lock.entries;
  }

  async query(filter: LockQueryFilter, scope: InstallScope, projectRoot?: string): Promise<CognitLockEntry[]> {
    const entries = Object.values(await this.getAll(scope, projectRoot));
    return entries.filter(entry => {
      if (filter.cognitiveType && entry.cognitiveType !== filter.cognitiveType) return false;
      if (filter.category && entry.category !== filter.category) return false;
      if (filter.sourceType && entry.sourceType !== filter.sourceType) return false;
      if (filter.agent && !entry.installedAgents.includes(filter.agent)) return false;
      if (filter.installedAfter && new Date(entry.installedAt) < filter.installedAfter) return false;
      if (filter.installedBefore && new Date(entry.installedAt) > filter.installedBefore) return false;
      return true;
    });
  }

  async getBySource(scope: InstallScope, projectRoot?: string): Promise<Map<string, { names: string[]; entry: CognitLockEntry }>> {
    const entries = await this.getAll(scope, projectRoot);
    const grouped = new Map<string, { names: string[]; entry: CognitLockEntry }>();
    for (const [key, entry] of Object.entries(entries)) {
      const existing = grouped.get(entry.source);
      if (existing) {
        existing.names.push(key);
      } else {
        grouped.set(entry.source, { names: [key], entry });
      }
    }
    return grouped;
  }

  getLockFilePath(scope: InstallScope, projectRoot?: string): string {
    const base = scope === 'global'
      ? getGlobalBase()
      : join(projectRoot ?? this.config.cwd, '.agents', 'cognit');
    return join(base, this.config.lockFileName);
  }

  async exists(scope: InstallScope, projectRoot?: string): Promise<boolean> {
    return this.fileOps.exists(this.getLockFilePath(scope, projectRoot));
  }
}
```

### Task 5.4.2: Lock Schema & Validation

**File:** `src/lock/schema.ts`

- [ ] Define v5 lock file schema types (already in `types/lock.ts`, validate at runtime here)
- [ ] Implement `validateLockFile(raw)` -- checks version, entries structure, required fields
- [ ] Implement `makeLockKey(cognitiveType, category, name)` -- composite key `{type}:{category}:{name}`
- [ ] Implement `parseLockKey(key)` -- decompose key back to parts
- [ ] Implement `createEmptyLockFile()` -- returns empty v5 structure with metadata

```typescript
// src/lock/schema.ts
export const CURRENT_LOCK_VERSION = 5;

export interface CognitLockFile {
  version: 5;
  entries: Record<string, CognitLockEntry>;
  metadata: LockMetadata;
}

export interface CognitLockEntry {
  name: string;
  cognitiveType: CognitiveType;
  category: string;
  source: string;
  sourceType: CognitiveSourceType;
  sourceUrl: string;
  sourcePath?: string;
  commitSha?: string;
  version?: string;
  folderHash: string;
  contentHash: string;
  installMode: InstallMode;
  installScope: InstallScope;
  installedAgents: AgentType[];
  canonicalPath: string;
  installedAt: string;
  updatedAt: string;
}

export interface LockMetadata {
  createdAt: string;
  updatedAt: string;
  sdkVersion: string;
  lastSelectedAgents?: string[];
  dismissedPrompts?: Record<string, boolean>;
}

export function makeLockKey(cognitiveType: CognitiveType, category: string, name: string): string {
  return `${cognitiveType}:${sanitizeName(category)}:${sanitizeName(name)}`;
}

export function parseLockKey(key: string): { cognitiveType: string; category: string; name: string } | null {
  const parts = key.split(':');
  if (parts.length !== 3) return null;
  return { cognitiveType: parts[0]!, category: parts[1]!, name: parts[2]! };
}

export function createEmptyLockFile(): CognitLockFile {
  const now = new Date().toISOString();
  return {
    version: CURRENT_LOCK_VERSION,
    entries: {},
    metadata: { createdAt: now, updatedAt: now, sdkVersion: SDK_VERSION },
  };
}
```

### Task 5.4.3: Lock Migration

**File:** `src/lock/migration.ts`

- [ ] Implement `readWithMigration(parsed, eventBus)` -- detects version and migrates
- [ ] Implement `migrateFromV3(old)` -- `skills` key -> `entries`, add `cognitiveType: 'skill'`, category `'general'`
- [ ] Implement `migrateFromV4(old)` -- `cognitives` -> `entries`, add composite keys, add metadata block, infer install state
- [ ] Detect old file names: `.skill-lock.json`, `.synk-lock.json`, `synapsync.lock`
- [ ] Backup old file as `.cognit-lock.json.bak` before migration
- [ ] If migration fails: create fresh empty lock file, emit warning event

```typescript
// src/lock/migration.ts
export function migrateFromV4(old: CognitLockFileV4): CognitLockFile {
  const entries: Record<string, CognitLockEntry> = {};

  for (const [name, entry] of Object.entries(old.cognitives)) {
    const cognitiveType = entry.cognitiveType || 'skill';
    const category = 'general'; // v4 had no categories
    const key = makeLockKey(cognitiveType, category, name);

    entries[key] = {
      name,
      cognitiveType,
      category,
      source: entry.source,
      sourceType: entry.sourceType as CognitiveSourceType,
      sourceUrl: entry.sourceUrl,
      sourcePath: entry.cognitivePath,
      commitSha: undefined,
      version: undefined,
      folderHash: entry.cognitiveFolderHash,
      contentHash: '',
      installMode: 'symlink',
      installScope: 'global',
      installedAgents: old.lastSelectedAgents ?? [],
      canonicalPath: `${COGNITIVE_SUBDIRS[cognitiveType]}/${category}/${name}`,
      installedAt: entry.installedAt,
      updatedAt: entry.updatedAt,
    };
  }

  return {
    version: CURRENT_LOCK_VERSION,
    entries,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sdkVersion: SDK_VERSION,
      lastSelectedAgents: old.lastSelectedAgents,
      dismissedPrompts: old.dismissed
        ? { findSkillsPrompt: old.dismissed.findSkillsPrompt ?? false }
        : undefined,
    },
  };
}
```

### Task 5.4.4: Integrity Hashing

**File:** `src/lock/integrity.ts`

- [ ] Implement `computeContentHash(content)` -- SHA-256 of primary cognitive file
- [ ] Implement `verifyContentHash(path, expectedHash, fs)` -- read file and compare
- [ ] Implement `computeDirectoryHash(dirPath, fs)` -- hash all files in directory combined
- [ ] Use Node.js `crypto.createHash('sha256')` -- zero external dependencies

```typescript
// src/lock/integrity.ts
import { createHash } from 'node:crypto';

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export async function verifyContentHash(
  path: string,
  expectedHash: string,
  fs: FileSystemAdapter,
): Promise<boolean> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return computeContentHash(content) === expectedHash;
  } catch {
    return false;
  }
}
```

### Task 5.4.5: Atomic Lock Writes

**File:** `src/lock/atomic.ts`

- [ ] Implement `writeLockFileAtomic(lockPath, lock, fileOps)` -- temp-file-then-rename
- [ ] Ensure directory exists before writing
- [ ] Format as JSON with 2-space indent + trailing newline
- [ ] Clean up temp file on failure

```typescript
// src/lock/atomic.ts
export async function writeLockFileAtomic(
  lockPath: string,
  lock: CognitLockFile,
  fileOps: FileOperations,
): Promise<void> {
  await fileOps.mkdir(dirname(lockPath), { recursive: true });
  const tempPath = lockPath + '.tmp.' + process.pid;
  const content = JSON.stringify(lock, null, 2) + '\n';

  try {
    await fileOps.writeFile(tempPath, content, 'utf-8');
    await fileOps.rename(tempPath, lockPath);
  } catch (error) {
    try { await fileOps.rm(tempPath, { force: true }); } catch { /* best effort */ }
    throw error;
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 5.5: Tests (0.5 days)

### Task 5.5.1: Installer Tests

**Directory:** `tests/installer/`

- [ ] `tests/installer/paths.test.ts` -- `sanitizeName`, `isPathSafe`, `getCanonicalPath`, `getAgentPath`, `findProjectRoot`, `getGlobalBase`
- [ ] `tests/installer/symlink.test.ts` -- symlink creation, ELOOP handling, existing entry handling, skip for universal agents
- [ ] `tests/installer/copy.test.ts` -- deep copy, excluded files, atomic copy
- [ ] `tests/installer/installer.test.ts` -- full install flow: canonical dir + symlink for non-universal, skip symlink for universal, copy fallback on symlink failure
- [ ] `tests/installer/rollback.test.ts` -- rollback reverses actions in LIFO order, handles partial failures
- [ ] All tests use `createMemoryFs()` -- zero real filesystem access

### Task 5.5.2: Lock Tests

**Directory:** `tests/lock/`

- [ ] `tests/lock/manager.test.ts` -- read (missing, valid, corrupted), write (round-trip), upsert, remove, get, getAll, query, getBySource
- [ ] `tests/lock/schema.test.ts` -- `makeLockKey`, `parseLockKey`, `createEmptyLockFile`, validation
- [ ] `tests/lock/migration.test.ts` -- v3 -> v5, v4 -> v5, old file name detection, backup creation, corrupted migration fallback
- [ ] `tests/lock/integrity.test.ts` -- SHA-256 determinism, `verifyContentHash` pass/fail
- [ ] `tests/lock/atomic.test.ts` -- atomic write creates temp then renames, cleans up on failure
- [ ] All tests use `createMemoryFs()` -- zero real filesystem access

**Verification:**
```bash
pnpm vitest run tests/installer/ tests/lock/
pnpm tsc --noEmit
```

---

## Definition of Done

- [ ] `InstallerImpl` handles symlink mode (with ELOOP detection) and copy mode (with fallback)
- [ ] `getCanonicalPath` produces `.agents/cognit/<type>/<category>/<name>/` paths
- [ ] `getAgentPath` produces flattened `.<agent>/<type>/<name>/` paths (no category)
- [ ] `findProjectRoot` correctly walks up directory tree
- [ ] `getGlobalBase` returns correct paths for macOS, Linux, Windows
- [ ] `sanitizeName` and `isPathSafe` prevent path traversal
- [ ] Atomic write pattern uses temp-file-then-rename
- [ ] Rollback engine reverses actions in LIFO order
- [ ] `LockFileManagerImpl` supports full CRUD: read, write, upsert, remove, get, getAll, query, getBySource
- [ ] Lock file uses v5 schema with composite keys `{type}:{category}:{name}`
- [ ] Migration from v3 and v4 formats works correctly
- [ ] SHA-256 content hashing is deterministic
- [ ] Old lock file names (`.skill-lock.json`, `.synk-lock.json`, `synapsync.lock`) detected and migrated
- [ ] All events emitted correctly: `install:start`, `install:complete`, `lock:read`, `lock:write`, `lock:migrate`
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm vitest run tests/installer/ tests/lock/` passes
- [ ] All tests use in-memory filesystem (no real I/O)

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Symlinks on Windows without DevMode** | Installation fails for symlink mode | Medium | Automatic fallback to copy mode with `symlinkFailed: true` in result |
| **ELOOP circular symlinks** | Installer hangs or throws unhandled | Low | `detectEloop()` catches ELOOP errors, force-removes broken link and retries |
| **Path separator differences (Win vs POSIX)** | Lock file paths inconsistent across platforms | Medium | `normalizeForStorage()` converts all `\` to `/` before storing. `path.join()` at filesystem boundary |
| **Concurrent lock file writes** | Lock file corruption if two SDK instances write simultaneously | Low | Atomic write (temp+rename). Serialized writes within a single SDK instance |
| **Lock migration data loss** | v3/v4 entries lose data during migration | Low | `.bak` backup before migration. Unit tests with actual v3/v4 fixtures |
| **Name collision across categories** | Two cognitives with same name in different categories collide in agent dirs | Medium | Warning emitted during install. `--force` required to overwrite. Lock tracks both entries. |
| **XDG_DATA_HOME not set on Linux** | Global path resolution fails | Low | Fallback to `~/.local/share/` which is the XDG default |
| **Large cognitive directories** | Copy mode slow for big skill directories | Low | Parallel copy with `Promise.all`. Assets beyond primary file are optional. |

---

## Rollback Strategy

If Sprint 5 cannot be completed:

1. **Installer rollback:** The built-in `rollback()` engine reverses all filesystem actions in LIFO order. If the installer code itself is defective, remove the `src/installer/` directory entirely -- Sprint 6 operations cannot proceed but Sprints 1-4 remain intact.

2. **Lock system rollback:** The lock manager always backs up as `.bak` before migration. If lock code is defective, remove `src/lock/` -- prior sprint outputs are unaffected.

3. **Partial completion:** The installer and lock system are independently testable. If only one subsystem is complete, the other can be deferred to Sprint 6 start.

---

## Notes

- The installer replaces 3 existing functions from the `cognit` codebase (`installCognitiveForAgent`, `installRemoteCognitiveForAgent`, `installWellKnownCognitiveForAgent`) with a single unified `Installer` interface.
- Categories exist in canonical paths but are flattened in agent directories -- agents like Claude and Cursor have no concept of categories.
- Lock file version 5 introduces composite keys (`{type}:{category}:{name}`), content hashing (SHA-256), a metadata block, and project-level scope -- all new compared to the v4 format in the existing codebase.
- The `FileSystemAdapter` injected via config is used for ALL filesystem operations -- never import `fs/promises` directly in installer or lock code.
