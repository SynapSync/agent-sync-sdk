# Analysis: Agent Sync SDK

**Package:** `@synapsync/agent-sync-sdk`
**Architecture Reference:** `.agents/plan/cognit-sdk-core/` (13 documents)
**Date:** 2026-02-09

---

## Executive Summary

**What:** An interface-agnostic TypeScript SDK for managing cognitive resources (skills, prompts, rules, agents) across 39+ AI coding agents. The SDK is the single programmatic entry point for all cognitive operations -- any CLI, web UI, or integration consumes it.

**Why:** The existing solutions are inadequate:
- The `cognit` fork (derived from `vercel-labs/skills`) is CLI-coupled, uses singletons, mixes logic with UI, and lacks extensibility for cognitive types beyond skills.
- The `synapse-cli` tool has a separate lock format and its own disorganized architecture.
- Neither provides a programmatic API. Both use `console.log` and `process.exit` directly.

**How:** A single npm package (`@synapsync/agent-sync-sdk`) with strict 6-layer architecture, dependency injection, `Result<T,E>` error handling, typed events, and injectable filesystem adapter for full testability. No monorepo. No CLI. SDK-first.

**Entry point:** `createAgentSyncSDK(config?)` factory function returns the fully wired SDK instance.

---

## Scope Definition

### In Scope

| Area | Description | Reference |
|------|-------------|-----------|
| **Type system** | Branded types (`AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier`), `Result<T,E>` discriminated union, typed error hierarchy, const maps over enums | `02-type-system.md` |
| **Agent definitions** | 39+ agents defined in YAML, compiled to TypeScript at build time. Convention-over-configuration (3-line YAML produces full config). `AgentRegistry` with detection, path resolution, universal agent tracking | `04-agent-system.md` |
| **Discovery engine** | Filesystem scanner for cognitive files (`SKILL.md`, `PROMPT.md`, `RULE.md`, `AGENT.md`), YAML frontmatter parser via `gray-matter`, plugin manifest support, type/subpath/internal filtering | `03-modules.md` Section 2.6 |
| **Source resolution** | Parse raw source strings (owner/repo shorthand, GitHub/GitLab URLs, local paths, direct URLs, well-known endpoints) into structured `SourceDescriptor` objects. 12-rule priority chain. | `05-provider-system.md` Section 6 |
| **Provider system** | `HostProvider` interface with 7 implementations: GitHub (git clone), Local (filesystem), Mintlify, HuggingFace, WellKnown (RFC 8615), Direct URL, Registry (future). Priority-ordered registry with first-match-wins. | `05-provider-system.md` |
| **Installer** | Unified installer replacing 3 existing functions. Symlink-first with copy fallback. Canonical directory structure (`.agents/cognit/<type>/<category>/<name>/`) with symlinks to agent-specific paths. Path traversal prevention, ELOOP detection, Windows junction support. | `07-installer.md` |
| **Lock system** | Version 5 schema with composite keys (`{type}:{category}:{name}`), metadata block, content hashing (SHA-256 + GitHub tree SHA), migration from v3/v4, atomic writes (temp+rename), project and global scopes | `08-lock-system.md` |
| **8 operations** | `add`, `list`, `remove`, `update`, `sync`, `check`, `init`, `find` -- all returning `Result<T,E>`, emitting typed events, fully non-interactive | `06-operations.md` |
| **Public API** | `createAgentSyncSDK()` composition root wiring all dependencies. `AgentSyncSDK` facade exposing operations, agent registry, provider registry, event subscription, config, and dispose. | `01-architecture.md` Section 5, 11 |
| **Additional providers** | Mintlify (frontmatter `mintlify-proj` validation), HuggingFace (Spaces blob-to-raw), WellKnown (`.well-known/cognitives/index.json` with legacy fallback), Direct URL (catch-all) | `05-provider-system.md` Sections 4.4-4.7 |
| **Category system** | 8 default categories (planning, qa, growth, frontend, backend, devops, security, general), hierarchical canonical paths, flattened agent paths | `10-categories.md` |

### Out of Scope

| Area | Rationale |
|------|-----------|
| **CLI** | Separate thin wrapper package consuming the SDK. Not part of this package. |
| **GUI / Web interface** | SDK returns structured data; presentation is a consumer concern. |
| **Agent marketplace / registry server** | The `RegistryProvider` client is in scope; the server is not. |
| **Real-time sync / watch mode** | Polling-based `sync` is sufficient for v1. Watch mode is a future enhancement. |
| **Plugin system** | v2 consideration. The `HostProvider` interface already enables extension. |
| **Telemetry server** | SDK supports configurable telemetry endpoint; the server is a separate service. |
| **CommonJS support** | ESM-only. Node >= 20 baseline eliminates CJS need. |

---

## Technical Analysis

### Architecture

The SDK uses a strict **6-layer architecture** where each layer may only import from layers below it (reference: `01-architecture.md` Section 2):

```
Layer 0: Types & Errors         (pure types, zero dependencies)
Layer 1: Config & Events         (SDK configuration, event bus)
Layer 2: Agents & Registry       (agent definitions, detection)
Layer 3: Discovery & Providers   (filesystem scanning, remote fetching)
Layer 4: Lock & Installer        (lock file management, file operations)
Layer 5: Operations              (add, remove, list, update, sync, check, init, find)
Layer 6: Public API              (SDK facade, factory function)
```

**Composition root pattern:** All concrete implementations are wired in `createAgentSyncSDK()`. No module instantiates its own dependencies. This eliminates the singleton problem present in the existing `cognit` codebase (reference: `01-architecture.md` Section 5).

**Dependency injection:** Every service receives dependencies through constructor injection. `AgentRegistryImpl(config, eventBus)`, `InstallerImpl(agentRegistry, fileOps, eventBus)`, etc. Tests inject fakes without module-level hacks.

**Result<T,E> over exceptions:** Operations that can fail with expected errors return `Result<T, CognitError>`. Only truly unexpected conditions (programmer errors, impossible states) throw. This makes error paths explicit and composable (reference: `01-architecture.md` Section 6).

**Typed EventBus:** All observability goes through a typed `EventBus` with 30+ event types across 8 categories (sdk, operation, discovery, provider, install, lock, git, agent, progress). Consumers subscribe to events they care about. The SDK never writes to stdout (reference: `01-architecture.md` Section 7).

**FileSystemAdapter:** All filesystem I/O goes through an injectable `FileSystemAdapter` interface with 12 methods (`readFile`, `writeFile`, `mkdir`, `readdir`, `stat`, `lstat`, `symlink`, `readlink`, `rm`, `rename`, `exists`, `copyDirectory`). Default implementation wraps Node.js `fs/promises`. Tests use `createMemoryFs(seed?)` (reference: `01-architecture.md` Section 9).

### Key Technical Decisions

These decisions are documented across the cognit-sdk-core plan and carry forward to agent-sync-sdk:

| # | Decision | Choice | Rationale | Reference |
|---|----------|--------|-----------|-----------|
| 1 | **Module system** | ESM-only, no CJS dual build | Modern baseline. Node 20+ natively supports ESM. Eliminates dual-build complexity. | `01-architecture.md` Section 1.6 |
| 2 | **ID safety** | Branded types for domain identifiers | `AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier` prevent accidental mixing of string types. Compile-time safety with zero runtime cost. | `02-type-system.md` Section 1 |
| 3 | **Agent definitions** | YAML files compiled to TypeScript | Adding an agent = adding a 3-line YAML file. Convention-over-configuration resolves `localRoot`, `globalRoot`, `detect` from `rootDir`. Build-time compile for zero-runtime parsing cost. | `04-agent-system.md` Section 2 |
| 4 | **Lock keys** | Composite `{type}:{category}:{name}` | Uniqueness across cognitive types and categories. Human-readable. Supports the category system. | `08-lock-system.md` Section 5.2 |
| 5 | **Install strategy** | Symlink-first, copy fallback | Single source of truth in canonical directory. Disk-efficient. Update propagation. Automatic fallback for Windows without DevMode. | `07-installer.md` |
| 6 | **Error handling** | `Result<T,E>` for expected failures, throw for bugs | Explicit error paths. No try/catch noise. Composable with `mapResult`. `CognitError` hierarchy with `code` and `module` for programmatic matching. | `01-architecture.md` Section 6 |
| 7 | **Enum alternative** | Const maps with `satisfies` | Better type inference, tree-shakeable, no TypeScript enum runtime overhead. `COGNITIVE_TYPE_CONFIGS` as `const satisfies Record<CognitiveType, CognitiveTypeConfig>`. | `02-type-system.md` Section 14 |
| 8 | **Testing strategy** | In-memory FS, no mocking libraries | `createMemoryFs()` + `createCapturingEventBus()` enable fast, deterministic, parallel-safe tests. Hand-written fakes over mocking libraries. | `12-testing-strategy.md` Section 1 |
| 9 | **Installer unification** | Single `Installer.install()` with `InstallRequest` union | Replaces 3 existing functions (`installCognitiveForAgent`, `installRemoteCognitiveForAgent`, `installWellKnownCognitiveForAgent`) that share 80% logic. Discriminated union input: `local | remote | wellknown`. | `03-modules.md` Section 2.9 |
| 10 | **Non-interactive operations** | Two-phase pattern for user input | Operations return `available` options when user selection is needed. Consumer presents choices and calls again with selections. SDK never reads stdin or calls `process.exit`. | `06-operations.md` Section 9 |

### Technology Stack

| Layer | Technology | Purpose | Version |
|-------|------------|---------|---------|
| Runtime | Node.js | Execution environment | >= 20 |
| Language | TypeScript | Type safety, strict mode | 5.x |
| Module System | ESM-only | `"type": "module"` in package.json | -- |
| Package Manager | pnpm | Fast, efficient | 9.x |
| Build Tool | tsup | ESM bundling + `.d.ts` generation | Latest |
| Test Framework | vitest | ESM-native, fast, v8 coverage | Latest |
| Frontmatter | gray-matter | YAML frontmatter parsing in cognitive files | Latest |
| Git | simple-git | Shallow clone operations for GitHub/GitLab sources | Latest |
| XDG Paths | xdg-basedir | Cross-platform config/data directory resolution | Latest |
| TS Config | `strict: true` | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `declaration`, `declarationMap`, `sourceMap` | -- |

### Dependencies

**Runtime dependencies (3):**
- `gray-matter` -- Parse YAML frontmatter from cognitive files (SKILL.md, PROMPT.md, etc.)
- `simple-git` -- Shallow git clone for GitHub/GitLab repository sources
- `xdg-basedir` -- Cross-platform XDG Base Directory resolution for global install paths

**Dev dependencies:**
- `typescript` (5.x) -- Compiler
- `tsup` -- ESM bundler with `.d.ts` generation
- `vitest` -- Test runner with v8 coverage
- `tsx` -- TypeScript execution for compile scripts (`compile-agents.ts`)
- `eslint` -- Linting with `no-restricted-imports` for layer enforcement

**Zero runtime dependencies beyond the 3 above.** No `zod` (validation is hand-written for zero-dependency types layer). No framework dependencies. No CLI libraries.

---

## Constraints & Risks

### Cross-Platform Compatibility

| Constraint | Detail | Mitigation |
|------------|--------|------------|
| **macOS / Linux / Windows** | All three platforms must be supported for file operations, symlinks, and path resolution | `FileSystemAdapter` abstraction; `path.join()` for separator handling; all YAML paths use forward slashes |
| **Symlinks on Windows** | Windows requires Developer Mode or admin for symlinks; `EPERM` thrown without it | Automatic fallback to copy mode with `symlinkFailed: true` in `InstallResult`. ELOOP detection for circular symlinks. |
| **XDG paths** | XDG Base Directory varies: `~/.config` on Linux/macOS, `%APPDATA%` on Windows | `xdg-basedir` package handles platform detection. Env variable resolution at module load time. |
| **Path separators** | Forward vs backslash | All internal paths normalized. `path.join()` at filesystem boundary. |

### Agent Diversity

| Constraint | Detail | Mitigation |
|------------|--------|------------|
| **39+ agent directory conventions** | Each agent has unique `localRoot`, `globalRoot`, detection rules | YAML-based agent definitions with convention-over-configuration. Adding an agent is a YAML file, not code. |
| **Universal vs non-universal agents** | Agents using `.agents/` as `localRoot` share the canonical directory. Others (cursor, claude-code, windsurf) need symlinks. | `AgentRegistry.isUniversal()` determines whether symlink creation is needed. Universal agents skip symlinking. |
| **Agent detection diversity** | 7 detection rule types: `homeDir`, `xdgConfig`, `cwdDir`, `absolutePath`, `envVar`, `envResolved`, `envResolvedPath` | OR-logic evaluation. Any matching rule marks agent as installed. |

### Lock Migration

| Constraint | Detail | Mitigation |
|------------|--------|------------|
| **v3 format** | `vercel-labs/skills` original: `skills` key, flat names | `migrateFromV3()`: rename key, add `cognitiveType: 'skill'`, add category `'general'` |
| **v4 format** | `cognit` fork: `cognitives` key, no category, no metadata | `migrateFromV4()`: `cognitives` -> `entries`, add composite keys, add metadata block, infer install state |
| **File renames** | `.skill-lock.json`, `.synk-lock.json`, `synapsync.lock` | Detect and rename on first read. Backup as `.bak` before migration. |
| **Corrupted JSON** | Lock file may be partially written (crash during write) | Atomic write pattern (temp+rename). Corrupted files return empty lock with warning event. |

### Performance

| Constraint | Detail | Target |
|------------|--------|--------|
| **Local operations** | `list`, `check`, `init` should be fast | Sub-100ms for local-only operations (no network) |
| **Git clone** | Shallow clone for GitHub sources | `depth: 1` default, configurable timeout (30s default) |
| **Agent detection** | 39+ agents detected in parallel | `Promise.all` on all detection functions |
| **Lock file I/O** | Single read per operation, serialized writes | In-memory cache per SDK instance, write-through |

---

## Success Criteria

| Criteria | Metric | Validation |
|----------|--------|------------|
| **All 8 operations work programmatically** | `add`, `list`, `remove`, `update`, `sync`, `check`, `init`, `find` all return `Result<T,E>` | Integration tests with in-memory FS |
| **85% test coverage** | Statements >= 85%, branches >= 80%, functions >= 85% | vitest v8 coverage report, per-module thresholds |
| **Zero runtime exceptions for expected failures** | All expected errors wrapped in `Result<T,E>` | No `try/catch` needed by consumers for normal operation |
| **Works with all 39+ agent definitions** | Every compiled YAML agent resolves correctly | `AgentRegistry.getAll().size >= 39`, detection tests per agent pattern |
| **Sub-100ms for local operations** | `list`, `check`, `init` complete within 100ms on warm FS | Performance benchmark in test suite |
| **Cross-platform** | macOS, Linux, Windows CI | GitHub Actions matrix: `ubuntu-latest`, `macos-latest`, `windows-latest` with Node 20 and 22 |
| **Single entry point** | `import { createAgentSyncSDK } from '@synapsync/agent-sync-sdk'` | Package exports verified in integration test |
| **No console output** | SDK never writes to stdout/stderr | Grep codebase for `console.` -- zero hits in `src/` |
| **Type safety** | TypeScript strict mode, no `any` | `tsc --noEmit` passes with strict flags |
| **Extensibility** | Custom providers and custom agents registrable at runtime | `sdk.providers.register(myProvider)`, `sdk.agents.register(myAgent)` work |

---

## Architecture Diagrams

### Layer Dependency Graph

```
                    Layer 6: createAgentSyncSDK()
                              |
                    Layer 5: Operations
              (add, list, remove, update, sync, check, init, find)
                    /         |          \
          Layer 4: Lock    Installer
                    |         |
          Layer 3: Discovery  Providers  Source
                    |         |          |
          Layer 2: Agents (Registry + Detector)
                    |
          Layer 1: Config    Events
                    |         |
          Layer 0: Types     Errors     FS
```

### Data Flow: `sdk.add("owner/repo")`

```
Consumer
  -> createAgentSyncSDK()
    -> sdk.add("owner/repo", { agents: ["claude-code"] })
      -> SourceParser.parse("owner/repo")
        -> { kind: "github", url: "https://github.com/owner/repo.git" }
      -> GitClient.clone(url, { depth: 1 })
        -> tempDir
      -> DiscoveryService.discover(tempDir)
        -> Cognitive[]
      -> Installer.install(cognitive, target) for each agent
        -> Write to .agents/cognit/skills/<category>/<name>/
        -> Symlink from .claude/skills/<name>/ -> canonical
      -> LockManager.addEntry(name, entry)
      -> GitClient.cleanup(tempDir)
    <- Result<AddResult>
```

### Module Count Estimate

| Module | Source Files | Estimated LOC | Test Files |
|--------|-------------|---------------|------------|
| `types/` | 12 | ~600 | 2 |
| `errors/` | 9 | ~250 | 3 |
| `config/` | 3 | ~120 | 2 |
| `events/` | 1 | ~80 | 1 |
| `fs/` | 3 | ~200 | 1 |
| `agents/` | 4 + 3 generated | ~300 + ~600 gen | 3 |
| `discovery/` | 4 | ~350 | 4 |
| `source/` | 3 | ~350 | 2 |
| `providers/` | 6 | ~800 | 6 |
| `installer/` | 4 | ~400 | 4 |
| `lock/` | 5 | ~400 | 5 |
| `operations/` | 9 | ~900 | 8 |
| `sdk.ts` + `index.ts` | 2 | ~150 | 1 |
| **Total** | **~68** | **~5,500** | **~42** |

Reference: `03-modules.md` Section 6.
