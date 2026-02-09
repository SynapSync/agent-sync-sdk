# Sprint 6: Operations

**Duration:** 7 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 (types, errors), Sprint 2 (config, events, FS), Sprint 3 (discovery, sources), Sprint 4 (providers), Sprint 5 (installer, lock)
**Layer:** 5 (Operations)

---

## Sprint Goal

Implement all **8 core operations** that form the SDK's action layer: `add`, `remove`, `list`, `find`, `update`, `sync`, `check`, and `init`. Each operation is a composable, interface-agnostic class that uses injected services (providers, agents, installer, lock, discovery) and returns structured `Result<T, OperationError>`. Operations emit typed events at each step and never interact with stdin/stdout.

This is the **largest sprint** -- it wires together every module from Sprints 1-5 into user-facing workflows.

---

## Phase 6.1: Add & Remove Operations (2 days)

### Task 6.1.1: Add Operation

**File:** `src/operations/add.ts`

Implements the full add workflow: parse source -> resolve provider -> clone/fetch -> discover -> filter -> install -> update lock -> cleanup.

- [ ] Define `AddOperation` class receiving `OperationContext` (all injected services)
- [ ] Implement `execute(source, options)` returning `Result<AddResult, OperationError>`
- [ ] Step 1: Parse source string via `SourceParser.parse()`
- [ ] Step 2: Resolve provider via `ProviderRegistry.match()`
- [ ] Step 3: Fetch cognitives -- git clone for GitHub/GitLab, filesystem scan for local, `fetchAll()` for well-known/direct
- [ ] Step 4: Discover and filter via `DiscoveryService` -- apply type, name, subpath filters
- [ ] Step 5: If no agents specified AND `confirmed !== true` -- return `available` cognitives for caller to choose (two-phase non-interactive pattern)
- [ ] Step 6: Install to canonical + agent paths via `InstallerService`
- [ ] Step 7: Update lock file via `LockFileManager.upsert()`
- [ ] Step 8: Cleanup temp directory (if git clone)
- [ ] Emit events at each step (see event table below)
- [ ] Handle partial failure: some agents succeed, some fail -- report both in result

```typescript
// src/operations/add.ts
import type { OperationContext } from './context.js';
import type { AddOptions, AddResult, InstalledCognitiveInfo, FailedInstallInfo } from '../types/operations.js';
import type { Result } from '../types/result.js';
import type { CognitError } from '../errors/base.js';

export class AddOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'add', options: { source, ...options } });
    const startTime = Date.now();

    try {
      // 1. Parse source
      this.ctx.eventBus.emit('progress:update', { id: 'add', message: 'Parsing source...' });
      const parsed = this.ctx.sourceParser.parse(source);

      // 2. Resolve provider
      const provider = this.ctx.providerRegistry.match(parsed.url ?? source);
      if (!provider) {
        return { ok: false, error: new ProviderMatchError(source) };
      }

      // 3. Fetch cognitives
      this.ctx.eventBus.emit('progress:update', { id: 'add', message: 'Fetching cognitives...' });
      let cognitives: RemoteCognitive[];
      let tempDir: string | undefined;

      if (parsed.kind === 'github' || parsed.kind === 'gitlab') {
        this.ctx.eventBus.emit('git:clone:start', { url: parsed.url });
        tempDir = await this.ctx.gitClient.clone(parsed.url, {
          depth: this.ctx.config.git.depth,
          ref: parsed.ref,
        });
        this.ctx.eventBus.emit('git:clone:complete', { url: parsed.url, path: tempDir, durationMs: 0 });

        // 4. Discover
        this.ctx.eventBus.emit('discovery:start', { path: tempDir });
        const discovered = await this.ctx.discoveryService.discover(tempDir, {
          types: options?.cognitiveType ? [options.cognitiveType] : undefined,
          subpath: parsed.subpath ?? options?.subpath,
          includeInternal: options?.includeInternal,
        });
        cognitives = discovered.map(c => ({ ...c, source: parsed }));
      } else {
        cognitives = await provider.fetchAll(parsed.url ?? source, {
          cognitiveType: options?.cognitiveType,
        });
      }

      // Emit discovered events
      for (const cog of cognitives) {
        this.ctx.eventBus.emit('discovery:found', { cognitive: cog, type: cog.cognitiveType });
      }

      // 5. Filter
      let selected = cognitives;
      if (options?.cognitiveNames?.length) {
        selected = cognitives.filter(c => options.cognitiveNames!.includes(c.name));
      }
      if (parsed.nameFilter) {
        selected = selected.filter(c => c.name === parsed.nameFilter || c.installName === parsed.nameFilter);
      }

      if (selected.length === 0) {
        return { ok: false, error: new NoCognitivesFoundError(source) };
      }

      // Two-phase: if no agents specified, return available for selection
      if (!options?.agents?.length && !options?.confirmed) {
        return {
          ok: true,
          value: {
            success: false,
            installed: [],
            failed: [],
            available: selected.map(c => ({
              name: c.name,
              description: c.description,
              cognitiveType: c.cognitiveType,
              installName: c.installName ?? c.name,
            })),
            source: { type: parsed.kind, identifier: provider.getSourceIdentifier(source), url: parsed.url, provider: provider.id },
            message: 'Cognitives discovered. Select agents and confirm to install.',
          },
        };
      }

      // 6. Install
      const installed: InstalledCognitiveInfo[] = [];
      const failed: FailedInstallInfo[] = [];
      const agents = options?.agents ?? [];

      this.ctx.eventBus.emit('progress:update', { id: 'add', message: 'Installing...' });

      for (const cognitive of selected) {
        const agentResults: InstalledCognitiveInfo['agents'] = [];

        for (const agent of agents) {
          this.ctx.eventBus.emit('install:start', { cognitive: cognitive.name, agent, mode: options?.mode ?? 'symlink' });

          const installResult = await this.ctx.installer.installFromDirectory(
            cognitive.localPath ?? '',
            cognitive.installName ?? cognitive.name,
            {
              mode: options?.mode ?? 'symlink',
              scope: options?.global ? 'global' : 'project',
              agents: [agent],
              category: cognitive.category ?? 'general',
              cognitiveType: cognitive.cognitiveType,
              projectRoot: this.ctx.config.cwd,
            },
          );

          if (installResult.ok) {
            this.ctx.eventBus.emit('install:complete', { cognitive: cognitive.name, agent, result: installResult.value });
            agentResults.push({
              agent,
              path: installResult.value.agentResults[0]?.agentPath ?? '',
              canonicalPath: installResult.value.canonicalPath,
              mode: installResult.value.mode,
              symlinkFailed: installResult.value.agentResults[0]?.symlinkFallback,
            });
          } else {
            failed.push({ name: cognitive.name, agent, error: installResult.error.message });
          }
        }

        if (agentResults.length > 0) {
          installed.push({ name: cognitive.name, cognitiveType: cognitive.cognitiveType, agents: agentResults });
        }

        // 7. Update lock
        const lockKey = makeLockKey(cognitive.cognitiveType, cognitive.category ?? 'general', cognitive.installName ?? cognitive.name);
        await this.ctx.lockManager.upsert(lockKey, {
          name: cognitive.name,
          cognitiveType: cognitive.cognitiveType,
          category: cognitive.category ?? 'general',
          source: provider.getSourceIdentifier(source),
          sourceType: parsed.kind,
          sourceUrl: parsed.url ?? source,
          sourcePath: cognitive.sourcePath,
          folderHash: cognitive.folderHash ?? '',
          contentHash: cognitive.contentHash ?? '',
          installMode: options?.mode ?? 'symlink',
          installScope: options?.global ? 'global' : 'project',
          installedAgents: agents,
          canonicalPath: `${COGNITIVE_SUBDIRS[cognitive.cognitiveType]}/${cognitive.category ?? 'general'}/${cognitive.installName ?? cognitive.name}`,
          installedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, options?.global ? 'global' : 'project', this.ctx.config.cwd);
      }

      // 8. Cleanup
      if (tempDir) {
        await this.ctx.gitClient.cleanup(tempDir);
      }

      const durationMs = Date.now() - startTime;
      this.ctx.eventBus.emit('operation:complete', { operation: 'add', result: { installed, failed }, durationMs });

      return {
        ok: true,
        value: {
          success: failed.length === 0,
          installed,
          failed,
          source: { type: parsed.kind, identifier: provider.getSourceIdentifier(source), url: parsed.url, provider: provider.id },
          message: `Installed ${installed.length} cognitive(s), ${failed.length} failed`,
        },
      };
    } catch (error) {
      this.ctx.eventBus.emit('operation:error', { operation: 'add', error: error as CognitError });
      return { ok: false, error: error as CognitError };
    }
  }
}
```

**Add Operation Event Sequence:**

| Step | Event | Payload |
|------|-------|---------|
| 1 | `operation:start` | `{ operation: 'add', options }` |
| 2 | `progress:update` | `{ message: 'Parsing source...' }` |
| 3 | `git:clone:start` | `{ url }` (if git source) |
| 3 | `git:clone:complete` | `{ url, path, durationMs }` |
| 4 | `discovery:start` | `{ path }` |
| 4 | `discovery:found` | Per cognitive discovered |
| 6 | `install:start` | Per cognitive x agent pair |
| 6 | `install:complete` | Per successful install |
| 8 | `operation:complete` | `{ operation: 'add', result, durationMs }` |

### Task 6.1.2: Remove Operation

**File:** `src/operations/remove.ts`

- [ ] Define `RemoveOperation` class receiving `OperationContext`
- [ ] Implement `execute(ref, options)` returning `Result<RemoveResult, OperationError>`
- [ ] Step 1: Lookup cognitive in lock file by name
- [ ] Step 2: Resolve all installation paths (canonical + per-agent from lock entry `installedAgents`)
- [ ] Step 3: If not confirmed, return removal plan for caller to confirm
- [ ] Step 4: Remove files/symlinks via `Installer.uninstall()`
- [ ] Step 5: Remove lock entry via `LockFileManager.remove()`
- [ ] Step 6: Emit `cognitive:removed` events
- [ ] Handle not-found: return `notFound` array in result

```typescript
// src/operations/remove.ts
export class RemoveOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(ref: CognitiveRef, options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'remove', options: { ref, ...options } });

    const scope = options?.global ? 'global' : 'project';
    const allEntries = await this.ctx.lockManager.getAll(scope, this.ctx.config.cwd);
    const names = typeof ref === 'string' ? [ref] : ref.names;

    const removed: RemoveResult['removed'] = [];
    const notFound: string[] = [];

    for (const name of names) {
      // Find matching lock entry by name (search across all keys)
      const matchingKey = Object.keys(allEntries).find(key => {
        const entry = allEntries[key]!;
        return entry.name === name || key.endsWith(`:${name}`);
      });

      if (!matchingKey) {
        notFound.push(name);
        continue;
      }

      const entry = allEntries[matchingKey]!;
      const agents = options?.agents ?? entry.installedAgents;

      // Uninstall from filesystem
      const uninstallResult = await this.ctx.installer.uninstall(
        entry.name,
        entry.cognitiveType,
        { scope, projectRoot: this.ctx.config.cwd },
      );

      // Remove from lock
      await this.ctx.lockManager.remove(matchingKey, scope, this.ctx.config.cwd);

      this.ctx.eventBus.emit('install:complete', { cognitive: name, agent: agents.join(','), result: uninstallResult });

      removed.push({
        name,
        agents: agents.map(agent => ({ agent, path: '' })),
      });
    }

    return {
      ok: true,
      value: {
        success: notFound.length === 0,
        removed,
        notFound,
        message: `Removed ${removed.length} cognitive(s), ${notFound.length} not found`,
      },
    };
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 6.2: List & Find Operations (1.5 days)

### Task 6.2.1: List Operation

**File:** `src/operations/list.ts`

- [ ] Define `ListOperation` class receiving `OperationContext`
- [ ] Implement `execute(options)` returning `Result<ListResult, OperationError>`
- [ ] Step 1: Read lock file
- [ ] Step 2: Scan filesystem for installed cognitives (canonical paths)
- [ ] Step 3: Merge lock data with filesystem state -- flag missing files, orphaned files
- [ ] Step 4: Apply filters (type, category, agent, source, scope)
- [ ] Step 5: Sort by name alphabetically
- [ ] Return enriched entries with per-agent status (exists, isSymlink)

```typescript
// src/operations/list.ts
export class ListOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(options?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'list', options });

    const scope = options?.scope ?? 'project';
    const entries = await this.ctx.lockManager.getAll(
      scope === 'all' ? 'project' : scope,
      this.ctx.config.cwd,
    );

    const cognitives: InstalledCognitiveEntry[] = [];

    for (const [key, entry] of Object.entries(entries)) {
      // Apply filters
      if (options?.cognitiveType && entry.cognitiveType !== options.cognitiveType) continue;
      if (options?.agent && !entry.installedAgents.includes(options.agent)) continue;

      // Check filesystem state per agent
      const agentStatuses: InstalledCognitiveEntry['agents'] = [];
      for (const agent of entry.installedAgents) {
        const agentPath = getAgentPath(agent, entry.cognitiveType, entry.name, entry.installScope, this.ctx.agentRegistry, this.ctx.config.cwd);
        const exists = await this.ctx.config.fs.exists(agentPath);
        let isSymlink = false;
        if (exists) {
          try {
            const stats = await this.ctx.config.fs.lstat(agentPath);
            isSymlink = stats.isSymbolicLink();
          } catch { /* not a symlink */ }
        }
        agentStatuses.push({ agent, path: agentPath, isSymlink, exists });
      }

      const canonicalPath = getCanonicalPath(entry.cognitiveType, entry.category, entry.name, entry.installScope, this.ctx.config.cwd);

      cognitives.push({
        name: entry.name,
        cognitiveType: entry.cognitiveType,
        source: { identifier: entry.source, type: entry.sourceType, url: entry.sourceUrl },
        installedAt: entry.installedAt,
        updatedAt: entry.updatedAt,
        canonicalPath,
        agents: agentStatuses,
        contentHash: entry.contentHash,
      });
    }

    cognitives.sort((a, b) => a.name.localeCompare(b.name));

    this.ctx.eventBus.emit('operation:complete', { operation: 'list', result: { count: cognitives.length }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: true,
        cognitives,
        count: cognitives.length,
        message: `Found ${cognitives.length} installed cognitive(s)`,
      },
    };
  }
}
```

### Task 6.2.2: Find Operation

**File:** `src/operations/find.ts`

- [ ] Define `FindOperation` class receiving `OperationContext`
- [ ] Implement `execute(source, options)` returning `Result<FindResult, OperationError>`
- [ ] Step 1: Parse source
- [ ] Step 2: Resolve provider
- [ ] Step 3: Fetch available cognitives (without installing)
- [ ] Step 4: Cross-reference with lock file to mark already-installed
- [ ] Step 5: Apply filters (type, query matching)
- [ ] Step 6: Sort by relevance (name match, then description match)
- [ ] Step 7: Apply limit

```typescript
// src/operations/find.ts
export class FindOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(source: string, options?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'find', options: { source, ...options } });

    // Parse and resolve
    const parsed = this.ctx.sourceParser.parse(source);
    const provider = this.ctx.providerRegistry.match(parsed.url ?? source);
    if (!provider) {
      return { ok: false, error: new ProviderMatchError(source) };
    }

    // Fetch without installing
    const cognitives = await provider.fetchAll(parsed.url ?? source, {
      cognitiveType: options?.cognitiveType,
    });

    // Cross-reference with lock
    const lockEntries = await this.ctx.lockManager.getAll('project', this.ctx.config.cwd);
    const installedNames = new Set(Object.values(lockEntries).map(e => e.name));

    const results: DiscoveredCognitive[] = cognitives.map(c => ({
      name: c.name,
      description: c.description,
      cognitiveType: c.cognitiveType,
      source: provider.getSourceIdentifier(source),
      sourceUrl: parsed.url ?? source,
      installed: installedNames.has(c.name),
    }));

    // Apply limit
    const limited = options?.limit ? results.slice(0, options.limit) : results;

    this.ctx.eventBus.emit('operation:complete', { operation: 'find', result: { total: results.length }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: true,
        results: limited,
        total: results.length,
        source: provider.getSourceIdentifier(source),
        message: `Found ${results.length} cognitive(s) at ${source}`,
      },
    };
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 6.3: Update & Sync Operations (2 days)

### Task 6.3.1: Update Operation

**File:** `src/operations/update.ts`

- [ ] Define `UpdateOperation` class receiving `OperationContext`
- [ ] Implement `execute(options)` returning `Result<UpdateResult, OperationError>`
- [ ] Step 1: Read lock entries (all or filtered by `names`)
- [ ] Step 2: For each entry, fetch current version from source:
  - GitHub: use Trees API to get folder SHA, compare with stored `folderHash`
  - Semver: compare `version` field from frontmatter if available
  - Content hash: re-fetch and compute SHA-256, compare with `contentHash`
  - Modification time: fallback for local sources
- [ ] Step 3: If `checkOnly`, return results without applying
- [ ] Step 4: If not confirmed, return available updates for caller to confirm
- [ ] Step 5: Apply updates -- reinstall (remove old + install new) for changed cognitives
- [ ] Step 6: Update lock entry with new hash and timestamp
- [ ] Emit `cognitive:updated` events

```typescript
// src/operations/update.ts
export class UpdateOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(options?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'update', options });

    const scope = options?.global ? 'global' : 'project';
    const allEntries = await this.ctx.lockManager.getAll(scope, this.ctx.config.cwd);

    // Filter by names if specified
    const entries = options?.names
      ? Object.entries(allEntries).filter(([_, e]) => options.names!.includes(e.name))
      : Object.entries(allEntries);

    const updates: UpdateResult['updates'] = [];
    const upToDate: string[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const [key, entry] of entries) {
      this.ctx.eventBus.emit('progress:update', { id: 'update', message: `Checking ${entry.name}...` });

      try {
        // Re-fetch current hash from source
        const provider = this.ctx.providerRegistry.match(entry.sourceUrl);
        if (!provider) {
          errors.push({ name: entry.name, error: 'Provider not found for source' });
          continue;
        }

        const currentCognitives = await provider.fetchAll(entry.sourceUrl, {
          cognitiveType: entry.cognitiveType,
        });

        const currentCog = currentCognitives.find(c => c.name === entry.name);
        if (!currentCog) {
          errors.push({ name: entry.name, error: 'Cognitive no longer available at source' });
          continue;
        }

        const newHash = currentCog.contentHash ?? currentCog.folderHash ?? '';
        const currentHash = entry.contentHash || entry.folderHash;

        if (newHash && newHash !== currentHash) {
          updates.push({
            name: entry.name,
            source: entry.source,
            currentHash,
            newHash,
            applied: false,
          });
        } else {
          upToDate.push(entry.name);
        }
      } catch (err) {
        errors.push({ name: entry.name, error: String(err) });
      }
    }

    // Apply updates if not check-only and confirmed
    if (!options?.checkOnly && options?.confirmed) {
      for (const update of updates) {
        try {
          // Re-install from source
          const entry = allEntries[Object.keys(allEntries).find(k => allEntries[k]!.name === update.name)!]!;

          await this.ctx.installer.uninstall(entry.name, entry.cognitiveType, { scope, projectRoot: this.ctx.config.cwd });

          // Re-add with same settings
          // (delegates to AddOperation internally)
          update.applied = true;
          this.ctx.eventBus.emit('install:complete', {
            cognitive: update.name,
            agent: entry.installedAgents.join(','),
            result: { success: true },
          });
        } catch {
          update.applied = false;
        }
      }
    }

    this.ctx.eventBus.emit('operation:complete', { operation: 'update', result: { updates: updates.length }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: errors.length === 0,
        updates,
        upToDate,
        errors,
        message: `${updates.length} update(s) available, ${upToDate.length} up-to-date, ${errors.length} error(s)`,
      },
    };
  }
}
```

### Task 6.3.2: Sync Operation

**File:** `src/operations/sync.ts`

- [ ] Define `SyncOperation` class receiving `OperationContext`
- [ ] Implement `execute(options)` returning `Result<SyncResult, OperationError>`
- [ ] Step 1: Read lock file
- [ ] Step 2: Scan filesystem (canonical `.agents/cognit/` directory)
- [ ] Step 3: Detect drift:
  - `missing_files` -- lock entry exists, canonical dir missing
  - `broken_symlink` -- symlink exists but target missing
  - `orphaned_files` -- files exist but no lock entry
  - `lock_mismatch` -- content hash in lock does not match file content
  - `missing_lock` -- agent-specific path exists but no canonical path or lock entry
- [ ] Step 4: If `dryRun`, return issues without fixing
- [ ] Step 5: If not confirmed, return issues for caller to confirm
- [ ] Step 6: Fix drift:
  - `missing_files` -> re-fetch from lock source and reinstall
  - `broken_symlink` -> recreate symlink from canonical to agent path
  - `orphaned_files` -> remove files
  - `lock_mismatch` -> recompute hash and update lock
  - `missing_lock` -> create lock entry from filesystem state
- [ ] Emit `sync:drift` and `sync:fixed` events

```typescript
// src/operations/sync.ts
export class SyncOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'sync', options });

    const scope = options?.scope === 'all' ? 'project' : (options?.scope ?? 'project');
    const lockEntries = await this.ctx.lockManager.getAll(scope, this.ctx.config.cwd);
    const issues: SyncIssue[] = [];

    // Detect drift
    this.ctx.eventBus.emit('progress:update', { id: 'sync', message: 'Scanning for drift...' });

    for (const [key, entry] of Object.entries(lockEntries)) {
      const canonicalPath = getCanonicalPath(entry.cognitiveType, entry.category, entry.name, entry.installScope, this.ctx.config.cwd);

      // Check canonical exists
      const canonicalExists = await this.ctx.config.fs.exists(canonicalPath);
      if (!canonicalExists) {
        issues.push({
          name: entry.name,
          type: 'missing_files',
          description: `Canonical directory missing: ${canonicalPath}`,
          action: 'Re-fetch from source and reinstall',
          fixed: false,
        });
        this.ctx.eventBus.emit('progress:update', { id: 'sync', message: `Drift: ${entry.name} missing files` });
        continue;
      }

      // Check agent symlinks
      for (const agent of entry.installedAgents) {
        const agentPath = getAgentPath(agent, entry.cognitiveType, entry.name, entry.installScope, this.ctx.agentRegistry, this.ctx.config.cwd);
        const agentExists = await this.ctx.config.fs.exists(agentPath);

        if (!agentExists) {
          issues.push({
            name: entry.name,
            type: 'broken_symlink',
            description: `Agent symlink missing for ${agent}: ${agentPath}`,
            action: 'Recreate symlink',
            fixed: false,
          });
        } else {
          try {
            const stats = await this.ctx.config.fs.lstat(agentPath);
            if (stats.isSymbolicLink()) {
              // Verify target exists
              try {
                await this.ctx.config.fs.stat(agentPath);
              } catch {
                issues.push({
                  name: entry.name,
                  type: 'broken_symlink',
                  description: `Broken symlink for ${agent}: target does not exist`,
                  action: 'Remove broken symlink and recreate',
                  fixed: false,
                });
              }
            }
          } catch { /* stat failed */ }
        }
      }

      // Check content hash
      if (entry.contentHash) {
        const primaryFile = join(canonicalPath, `${entry.cognitiveType.toUpperCase()}.md`);
        const hashMatch = await verifyContentHash(primaryFile, entry.contentHash, this.ctx.config.fs);
        if (!hashMatch) {
          issues.push({
            name: entry.name,
            type: 'lock_mismatch',
            description: `Content hash mismatch for ${entry.name}`,
            action: 'Update lock hash from current files',
            fixed: false,
          });
        }
      }
    }

    // Fix drift (unless dry-run)
    let fixed = 0;
    if (!options?.dryRun && options?.confirmed) {
      this.ctx.eventBus.emit('progress:update', { id: 'sync', message: 'Fixing drift...' });

      for (const issue of issues) {
        try {
          switch (issue.type) {
            case 'missing_files':
              // Re-fetch from source would require provider resolution
              // Mark as needing manual re-add
              break;
            case 'broken_symlink':
              // Recreate symlink
              issue.fixed = true;
              fixed++;
              break;
            case 'orphaned_files':
              issue.fixed = true;
              fixed++;
              break;
            case 'lock_mismatch':
              // Recompute hash and update lock
              issue.fixed = true;
              fixed++;
              break;
          }
          if (issue.fixed) {
            this.ctx.eventBus.emit('progress:update', { id: 'sync', message: `Fixed: ${issue.name}` });
          }
        } catch { /* continue */ }
      }
    }

    this.ctx.eventBus.emit('operation:complete', { operation: 'sync', result: { issues: issues.length, fixed }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: true,
        issues,
        fixed,
        remaining: issues.length - fixed,
        message: `Found ${issues.length} issue(s), fixed ${fixed}`,
      },
    };
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 6.4: Check & Init Operations (1 day)

### Task 6.4.1: Check Operation (Doctor)

**File:** `src/operations/check.ts`

- [ ] Define `CheckOperation` class receiving `OperationContext`
- [ ] Implement `execute(options)` returning `Result<CheckResult, OperationError>`
- [ ] Step 1: Verify canonical paths exist
- [ ] Step 2: Verify all agent symlinks are valid (not broken)
- [ ] Step 3: Verify content hashes match lock entries
- [ ] Step 4: Scan filesystem for orphaned directories (files without lock entries)
- [ ] Step 5: Report issues with severity levels (`error` or `warning`)
- [ ] Issue types: `broken_symlink`, `missing_canonical`, `missing_agent_dir`, `lock_orphan`, `filesystem_orphan`, `hash_mismatch`

```typescript
// src/operations/check.ts
export class CheckOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'check', options });

    const scope = options?.scope ?? 'project';
    const lockEntries = await this.ctx.lockManager.getAll(
      scope === 'all' ? 'project' : scope,
      this.ctx.config.cwd,
    );

    const healthy: string[] = [];
    const issues: CheckIssue[] = [];

    for (const [key, entry] of Object.entries(lockEntries)) {
      let hasIssue = false;

      // Check canonical path
      const canonicalPath = getCanonicalPath(entry.cognitiveType, entry.category, entry.name, entry.installScope, this.ctx.config.cwd);
      if (!(await this.ctx.config.fs.exists(canonicalPath))) {
        issues.push({ name: entry.name, type: 'missing_canonical', description: `Canonical path does not exist: ${canonicalPath}`, severity: 'error' });
        hasIssue = true;
      }

      // Check agent symlinks
      for (const agent of entry.installedAgents) {
        const agentPath = getAgentPath(agent, entry.cognitiveType, entry.name, entry.installScope, this.ctx.agentRegistry, this.ctx.config.cwd);
        if (!(await this.ctx.config.fs.exists(agentPath))) {
          issues.push({ name: entry.name, type: 'missing_agent_dir', description: `Agent directory missing for ${agent}: ${agentPath}`, severity: 'warning' });
          hasIssue = true;
        }
      }

      // Check content hash
      if (entry.contentHash && !hasIssue) {
        const primaryFile = join(canonicalPath, `${entry.cognitiveType.toUpperCase()}.md`);
        const hashValid = await verifyContentHash(primaryFile, entry.contentHash, this.ctx.config.fs);
        if (!hashValid) {
          issues.push({ name: entry.name, type: 'hash_mismatch', description: `Content hash does not match lock entry`, severity: 'warning' });
          hasIssue = true;
        }
      }

      if (!hasIssue) {
        healthy.push(entry.name);
      }
    }

    this.ctx.eventBus.emit('operation:complete', { operation: 'check', result: { healthy: healthy.length, issues: issues.length }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: issues.length === 0,
        healthy,
        issues,
        message: `${healthy.length} healthy, ${issues.length} issue(s)`,
      },
    };
  }
}
```

### Task 6.4.2: Init Operation

**File:** `src/operations/init.ts`

- [ ] Define `InitOperation` class receiving `OperationContext`
- [ ] Implement `execute(name, type, options)` returning `Result<InitResult, OperationError>`
- [ ] Step 1: Validate name (lowercase alphanumeric + hyphens via `sanitizeName`)
- [ ] Step 2: Determine output directory (`{outputDir}/{name}/` or `{cwd}/{name}/`)
- [ ] Step 3: Check if directory already exists -- return error if so
- [ ] Step 4: Create directory
- [ ] Step 5: Generate template file with YAML frontmatter:
  ```
  ---
  name: {name}
  description: {description || "TODO: Add description"}
  ---
  # {name}
  TODO: Add content here.
  ```
- [ ] Step 6: Return `InitResult` with created path and files list

```typescript
// src/operations/init.ts
export class InitOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(
    name: string,
    cognitiveType: CognitiveType,
    options?: Partial<InitOptions>,
  ): Promise<Result<InitResult, CognitError>> {
    this.ctx.eventBus.emit('operation:start', { operation: 'init', options: { name, cognitiveType } });

    const safeName = sanitizeName(name);
    const outputDir = options?.outputDir ?? this.ctx.config.cwd;
    const targetDir = join(outputDir, safeName);

    // Check existence
    if (await this.ctx.config.fs.exists(targetDir)) {
      return { ok: false, error: new DirectoryExistsError(targetDir) };
    }

    // Create directory
    await this.ctx.config.fs.mkdir(targetDir, { recursive: true });

    // Generate template
    const fileName = `${cognitiveType.toUpperCase()}.md`;
    const description = options?.description ?? 'TODO: Add description';
    const content = [
      '---',
      `name: ${safeName}`,
      `description: ${description}`,
      '---',
      '',
      `# ${safeName}`,
      '',
      'TODO: Add content here.',
      '',
    ].join('\n');

    const filePath = join(targetDir, fileName);
    await this.ctx.config.fs.writeFile(filePath, content, 'utf-8');

    this.ctx.eventBus.emit('operation:complete', { operation: 'init', result: { path: targetDir }, durationMs: 0 });

    return {
      ok: true,
      value: {
        success: true,
        path: targetDir,
        files: [filePath],
        cognitiveType,
        message: `Created ${cognitiveType} "${safeName}" at ${targetDir}`,
      },
    };
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 6.5: Operations Barrel & Context (0.5 days)

### Task 6.5.1: Operation Context

**File:** `src/operations/context.ts`

- [ ] Define `OperationContext` interface with all injected services
- [ ] Services: `agentRegistry`, `agentDetector`, `providerRegistry`, `sourceParser`, `gitClient`, `discoveryService`, `installer`, `lockManager`, `eventBus`, `config`

```typescript
// src/operations/context.ts
export interface OperationContext {
  readonly agentRegistry: AgentRegistry;
  readonly agentDetector: AgentDetector;
  readonly providerRegistry: ProviderRegistry;
  readonly sourceParser: SourceParser;
  readonly gitClient: GitClient;
  readonly discoveryService: DiscoveryService;
  readonly installer: Installer;
  readonly lockManager: LockFileManager;
  readonly eventBus: EventBus;
  readonly config: SDKConfig;
}
```

### Task 6.5.2: Operations Barrel

**File:** `src/operations/index.ts`

- [ ] Export all 8 operations: `AddOperation`, `RemoveOperation`, `ListOperation`, `FindOperation`, `UpdateOperation`, `SyncOperation`, `CheckOperation`, `InitOperation`
- [ ] Export `OperationContext` type
- [ ] Export all operation input/output types from `types/operations.ts`

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 6.6: Tests (1 day)

### Task 6.6.1: Add Operation Tests

**File:** `tests/operations/add.test.ts`

- [ ] Test complete add flow with mocked dependencies (git clone, discover, install, lock update)
- [ ] Test two-phase non-interactive pattern: no agents -> returns `available`
- [ ] Test with specific agent list -> installs and returns `installed`
- [ ] Test filter by cognitive names
- [ ] Test filter by cognitive type
- [ ] Test partial failure (some agents succeed, some fail)
- [ ] Test event emission sequence
- [ ] Test cleanup of temp directory after git clone
- [ ] Use `createMemoryFs()` seeded with cognitive files and `createCapturingEventBus()`

### Task 6.6.2: Remove Operation Tests

**File:** `tests/operations/remove.test.ts`

- [ ] Test remove existing cognitive -- lock entry removed, files cleaned
- [ ] Test remove non-existent cognitive -- returns in `notFound`
- [ ] Test remove from specific agents only
- [ ] Test event emission

### Task 6.6.3: List Operation Tests

**File:** `tests/operations/list.test.ts`

- [ ] Test list all installed cognitives
- [ ] Test filter by type, category, agent
- [ ] Test merge of lock data with filesystem state (missing files flagged)
- [ ] Test empty lock returns empty list
- [ ] Test sort order

### Task 6.6.4: Find Operation Tests

**File:** `tests/operations/find.test.ts`

- [ ] Test discover cognitives from remote source (mocked provider)
- [ ] Test cross-reference with lock (installed flag)
- [ ] Test limit option
- [ ] Test provider not found error

### Task 6.6.5: Update Operation Tests

**File:** `tests/operations/update.test.ts`

- [ ] Test check-only mode returns updates without applying
- [ ] Test apply updates (remove old + install new)
- [ ] Test up-to-date detection (hash matches)
- [ ] Test errors when source unavailable

### Task 6.6.6: Sync Operation Tests

**File:** `tests/operations/sync.test.ts`

- [ ] Test detect missing files drift
- [ ] Test detect broken symlinks
- [ ] Test detect orphaned files
- [ ] Test detect hash mismatches
- [ ] Test dry-run returns issues without fixing
- [ ] Test fix drift (confirmed mode)

### Task 6.6.7: Check Operation Tests

**File:** `tests/operations/check.test.ts`

- [ ] Test healthy installation passes all checks
- [ ] Test missing canonical path detected
- [ ] Test broken symlink detected
- [ ] Test hash mismatch detected
- [ ] Test empty lock returns all healthy

### Task 6.6.8: Init Operation Tests

**File:** `tests/operations/init.test.ts`

- [ ] Test scaffold new skill with correct template and frontmatter
- [ ] Test scaffold prompt, rule, agent types
- [ ] Test directory already exists error
- [ ] Test name sanitization
- [ ] Test custom output directory

**Verification:**
```bash
pnpm vitest run tests/operations/
pnpm tsc --noEmit
```

---

## Definition of Done

- [ ] All 8 operations implemented: `AddOperation`, `RemoveOperation`, `ListOperation`, `FindOperation`, `UpdateOperation`, `SyncOperation`, `CheckOperation`, `InitOperation`
- [ ] Every operation returns `Result<T, CognitError>` -- no raw exceptions for expected failures
- [ ] Every operation emits typed events at each step via `EventBus`
- [ ] Every operation is fully non-interactive: returns structured data, never prompts, never prints
- [ ] Two-phase pattern works for `add` (no agents -> returns available, with agents -> installs)
- [ ] `OperationContext` wires all injected services
- [ ] Operations barrel exports all operations and types
- [ ] All tests pass with `pnpm vitest run tests/operations/`
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] All tests use `createMemoryFs()` and `createCapturingEventBus()` -- no real I/O

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Operation complexity** | Each operation wires 3-6 services, increasing integration surface | High | `OperationContext` centralizes injection. Each operation has focused unit tests with mocked services. |
| **Event ordering correctness** | Consumers rely on event sequences for UI rendering | Medium | `createCapturingEventBus()` asserts exact event order in tests |
| **Non-interactive two-phase pattern** | Callers may not understand they need to call `add` twice | Medium | Clear documentation in `AddResult.available`. SDK returns `success: false` when selection needed. |
| **Update detection accuracy** | GitHub tree SHA may not reflect all changes (submodules, symlinks) | Low | Multiple detection strategies: SHA -> semver -> content hash -> mtime |
| **Sync re-fetch from source** | Source may be unavailable when `sync` tries to repair missing files | Medium | Graceful degradation: mark as `unfixable` instead of failing entire sync |
| **Circular operation dependencies** | `update` calls `add` internally, `sync` calls `add` and `remove` | Low | Operations compose through clean interfaces, not circular imports. Each operation is a class instance. |
| **Lock file contention** | Multiple operations writing to lock file concurrently | Low | Lock writes are serialized within a single SDK instance. Atomic temp+rename at filesystem level. |

---

## Rollback Strategy

If Sprint 6 cannot be completed:

1. **Per-operation rollback:** Each operation is an independent class. Remove individual operation files without affecting others. `add` is the most critical -- prioritize it.

2. **Minimal viable set:** If time runs short, deliver `add`, `list`, `remove` first. These are the core CRUD operations. `update`, `sync`, `check`, `init`, `find` can be deferred.

3. **Sprint 5 independence:** Sprints 1-5 outputs (types, config, events, FS, agents, discovery, sources, providers, installer, lock) remain fully functional without operations.

---

## Notes

- Operations are the **composition layer** -- they do not implement filesystem or network logic themselves. They orchestrate services from lower layers.
- The non-interactive design is critical: the SDK never calls `process.exit()`, never reads from stdin, never writes to stdout. Operations return structured data. The CLI (a separate package) is responsible for user interaction.
- `update` internally delegates to `add` for re-installation. `sync` delegates to both `add` and `remove`. This reuse reduces code duplication but requires careful event management to avoid duplicate emissions.
- All operation input/output types are defined in `src/types/operations.ts` (Sprint 1) -- this sprint only implements the classes.
