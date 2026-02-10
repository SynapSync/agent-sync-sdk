# Changelog

All notable changes to the `@synapsync/agent-sync-sdk` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

#### Project Restructure & Documentation
- **Documentation suite** (`docs/`): 8 comprehensive guides — Getting Started, API Reference, Type System, Providers, Events, Errors, Architecture, Agents
- **README.md**: Complete rewrite with badges, quick start, supported agents table, cognitive types, documentation links
- **Path restructure**: Moved build-time definitions to consolidate with their output:
  - `agents/*.yaml` → `src/agents/definitions/*.yaml`
  - `config/cognitive-types.yaml` → `src/agents/definitions/cognitive-types.yaml`
  - `scripts/compile-agents.ts` → `src/agents/definitions/compile.ts`
  - Removed empty root directories: `agents/`, `config/`, `scripts/`
- **`examples/` directory**: Created for usage examples

#### Sprint 8: Quality & Hardening
- **Unit test audit**: Filled coverage gaps across all modules — errors (31 tests), config/categories (6), discovery/validator (7), installer/symlink (6), installer/flatten (7), installer/atomic (7)
- **Provider coverage**: Full tests for MintlifyProvider (11), HuggingFaceProvider (10), DirectURLProvider (14), registerDefaultProviders (3), CloneCache/FetchCache extended (9)
- **Agent registry extended**: detectInstalled, register, universal/non-universal agents, event emission (12 tests)
- **Source git tests**: Mocked simple-git for clone/cleanup with event assertions (5 tests)
- **SDK operation tests**: find, sync, update, remove, add via public API (17 tests)
- **Integration tests**: add-flow (8), full lifecycle (4), multi-agent installation (6)
- **E2E tests**: Real filesystem lifecycle with temp directories — init, list, check, full add→remove cycle (9 tests)
- **CI workflow** (`.github/workflows/ci.yml`): GitHub Actions with Node 20/22 matrix, pnpm, compile-agents, typecheck, build, test+coverage
- **Coverage thresholds** (`vitest.config.ts`): Statements 85%, branches 80%, functions 85%, lines 85% — all exceeded
- **Final metrics**: 458 tests / 53 files, 92.28% stmts, 85.96% branches, 97.37% functions, 0 TS errors, 0 `any`, 0 `console.`, 0 `process.exit`

#### Sprint 7: Public API & Extended Providers
- **SDK factory** (`src/sdk.ts`): `createAgentSyncSDK(userConfig?)` composition root — the only place concrete implementations are instantiated. Wires 6 architectural layers: Config/Events → Agents → Discovery/Providers → Installer/Lock → Operations → Facade
- **AgentSyncSDK interface** (`src/sdk.ts`): Public contract with 8 operation methods (`add`, `remove`, `list`, `find`, `update`, `sync`, `check`, `init`), 4 accessors (`events`, `config`, `agents`, `providers`), event convenience methods (`on`, `once`), and `dispose()`
- **Public API entry point** (`src/index.ts`): Exports `createAgentSyncSDK`, all consumer-facing types, error classes, result helpers, brand constructors, and FS adapters. Does NOT export internal implementations
- **WellKnown provider** (`src/providers/wellknown.ts`): `WellKnownProvider` for RFC 8615 well-known endpoint discovery at `/.well-known/cognitives/index.json` with legacy `/.well-known/skills/` fallback
- **Provider registration**: 7 providers registered in priority order: custom → GitHub → Local → Mintlify → HuggingFace → WellKnown → DirectURL (first-match-wins)
- **Package build**: `tsup` produces `dist/index.js` (110KB) and `dist/index.d.ts` (25.7KB)
- SDK + provider tests: 22 tests across 2 test files (sdk integration, wellknown provider)

#### Sprint 6: Operations
- **Operation types** (`src/types/operations.ts`): All operation I/O types — `AddOptions/AddResult`, `RemoveOptions/RemoveResult`, `ListOptions/ListResult`, `FindOptions/FindResult`, `UpdateOptions/UpdateResult`, `SyncOptions/SyncResult`, `CheckOptions/CheckResult`, `InitOptions/InitResult`, plus supporting types (`InstalledCognitiveInfo`, `AvailableCognitive`, `SourceInfo`, `SyncIssue`, `CheckIssue`, etc.)
- **Operation context** (`src/operations/context.ts`): `OperationContext` interface wiring all services (agentRegistry, providerRegistry, sourceParser, gitClient, discoveryService, installer, lockManager, eventBus, config)
- **Add operation** (`src/operations/add.ts`): `AddOperation` — two-phase workflow: parse source → resolve cognitives (local discovery, provider fetch, or git clone fallback) → apply filters → return available list if unconfirmed → install each cognitive × each agent → record in lock
- **Remove operation** (`src/operations/remove.ts`): `RemoveOperation` — lookup lock entries, remove from each agent via installer, remove lock entry
- **List operation** (`src/operations/list.ts`): `ListOperation` — read all lock entries, filter by cognitiveType, sort by name
- **Find operation** (`src/operations/find.ts`): `FindOperation` — parse source, fetch via provider, cross-reference with lock for installed flag, apply limit
- **Update operation** (`src/operations/update.ts`): `UpdateOperation` — re-fetch remote content, compare content hashes, apply updates if confirmed (remove + reinstall per installed agent)
- **Sync operation** (`src/operations/sync.ts`): `SyncOperation` — check canonical paths exist, verify content hashes, report `SyncIssue[]` (missing_files, lock_mismatch)
- **Check operation** (`src/operations/check.ts`): `CheckOperation` — check canonical paths and hashes, report `CheckIssue[]` with severity (error/warning)
- **Init operation** (`src/operations/init.ts`): `InitOperation` — sanitize name, create directory + template file with YAML frontmatter
- Operation tests: 66 tests across 8 test files (add, remove, list, find, update, sync, check, init)

#### Sprint 5: Installation & Persistence
- **Installer service** (`src/installer/service.ts`): `InstallerImpl` — unified installer for local, remote, and well-known cognitives; supports symlink mode with automatic copy fallback; emits `install:start`, `install:symlink`, `install:copy`, `install:complete` events
- **Symlink support** (`src/installer/symlink.ts`): `createSymlink()` — relative symlinks, ELOOP detection, existing entry handling, skip when paths resolve to same location
- **Copy mode** (`src/installer/copy.ts`): `deepCopy()` — recursive directory copy with `Promise.all` parallelism, excludes `_*`, `.git/`, `README.md`, `metadata.json`
- **Path resolution** (`src/installer/paths.ts`): `getCanonicalPath()` (`.agents/cognit/<type>/<category>/<name>/`), `getAgentInstallPath()` (flattened agent dirs), `findProjectRoot()` (walks up for `.agents/cognit`, `.git`, `package.json`), `getGlobalBase()` (XDG on Linux, `~/.agents/cognit` on macOS, `%APPDATA%\cognit` on Windows)
- **Security** (`src/installer/security.ts`): `sanitizeName()` (kebab-case, 255 char limit, path traversal rejection), `isPathSafe()` (containment check via `path.resolve`)
- **Atomic writes** (`src/installer/atomic.ts`): `atomicWriteFile()` — temp-file-then-rename with unique counter to prevent parallel collisions
- **Rollback engine** (`src/installer/rollback.ts`): LIFO rollback of `InstallAction[]` with 6 action types, best-effort recovery
- **Category flattening** (`src/installer/flatten.ts`): `shouldSkipSymlink()` for universal agents, `getAgentSymlinkPaths()` for non-universal agents
- **Lock file manager** (`src/lock/manager.ts`): `LockFileManagerImpl` — full CRUD: `read()`, `write()`, `addEntry()`, `removeEntry()`, `getEntry()`, `getAllEntries()`, `getBySource()`, `getLastSelectedAgents()`, `saveLastSelectedAgents()`
- **Lock schema** (`src/lock/schema.ts`): v5 format with composite keys (`{type}:{name}`), `makeLockKey()`, `parseLockKey()`, `createEmptyLockFile()`, runtime validation
- **Lock migration** (`src/lock/migration.ts`): `readWithMigration()` — v3 → v5 (skills → cognitives), v4 → v5 (add composite keys), graceful fallback to empty on corruption
- **Integrity hashing** (`src/lock/integrity.ts`): SHA-256 `computeContentHash()`, `verifyContentHash()`, `computeDirectoryHash()` (sorted file order)
- **Atomic lock writes** (`src/lock/atomic.ts`): `writeLockFileAtomic()` — JSON with 2-space indent, temp+rename, cleanup on failure
- Installer tests: 41 tests across 5 test files (security, paths, copy, rollback, installer)
- Lock tests: 37 tests across 5 test files (schema, integrity, migration, manager, atomic)

#### Sprint 4: Providers
- **Provider registry** (`src/providers/registry.ts`): `ProviderRegistryImpl` with ordered first-match-wins lookup, duplicate id rejection
- **GitHub provider** (`src/providers/github.ts`): `GitHubProvider` — matches GitHub URLs and `owner/repo` shorthands, clone via `GitClient`, discover cognitives, convert to `RemoteCognitive[]`, blob-to-raw URL conversion
- **Local provider** (`src/providers/local.ts`): `LocalProvider` — matches local paths (absolute, relative, `.`), resolves relative to cwd, discovers cognitives via `DiscoveryService`
- **Caching layer** (`src/providers/cache.ts`): `CloneCache` (SHA-256 keys, 1h TTL) + `FetchCache` (15min TTL), both backed by `FileSystemAdapter`
- **Stub providers**: `MintlifyProvider`, `HuggingFaceProvider`, `DirectURLProvider` — interface-complete stubs for Sprint 7
- **Registration** (`src/providers/register-defaults.ts`): `registerDefaultProviders()` with custom providers first, then built-in priority order
- Provider tests: 25 tests across 4 test files (registry, github, local, cache)

#### Sprint 3: Discovery & Sources
- **Discovery pipeline** (`src/discovery/`): 5 files
  - `CognitiveScanner`: traverses directories finding cognitive files (SKILL.md, PROMPT.md, RULE.md, AGENT.md) with priority search (typed subdirs first, then flat), skips hidden dirs and node_modules, configurable maxDepth, deduplication
  - `CognitiveParser`: extracts frontmatter with `gray-matter`, fallback name from dir name, fallback description from first content line, stores all metadata
  - `CognitiveFilter`: filter by type, name pattern (substring), tags (intersection), category
  - `CognitiveValidator`: validates name/type/path using `Result<T, E>` pattern
  - `DiscoveryServiceImpl`: orchestrates scan -> parse -> validate -> filter pipeline with event emission (`discovery:start`, `discovery:found`, `discovery:complete`)
- **Source resolution** (`src/source/`): 3 files
  - `SourceParserImpl`: 12-step resolution chain (local path, direct URL, GitHub tree/repo, GitLab tree/repo, owner/repo@name shorthand, well-known URL, git fallback)
  - `GitClientImpl`: shallow clone with `simple-git`, configurable depth/timeout/ref, temp directory management, event emission (`git:clone:start`, `git:clone:complete`, `git:clone:error`)
- Discovery & source tests: 40 tests across 4 test files (scanner, parser, source parser, integration)

## [0.1.0] - 2026-02-09

### Added

#### Sprint 1: Foundation
- Project scaffolding: `package.json`, `tsconfig.json` (strict mode), `vitest.config.ts`, `tsup.config.ts`, `eslint.config.js`
- **Type system** (`src/types/`): 10 files
  - Branded types: `AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier` with constructors and type guards
  - `Result<T, E>` discriminated union with `ok()`, `err()`, `unwrap()`, `mapResult()`, `isOk()`, `isErr()`
  - Core interfaces: `Cognitive`, `RemoteCognitive`, `CognitiveRef`, `AgentConfig`, `AgentRegistry`
  - `SDKConfig`, `FileSystemAdapter`, `EventBus`, `HostProvider`, `Installer`, `LockManager`
  - `SDKEventMap` with 26+ typed events
  - `COGNITIVE_TYPE_CONFIGS`, `DEFAULT_CATEGORIES` (11 categories)
- **Error hierarchy** (`src/errors/`): 9 files
  - `CognitError` abstract base with `code`, `module`, `toJSON()`
  - 20+ concrete error classes across config, provider, install, lock, discovery, operation, source
  - `ERROR_CODES` const map with `ErrorCode` type
- Foundation tests: 25 tests across 3 test files

#### Sprint 2: Core Systems
- **Config system** (`src/config/`): `resolveConfig()` with partial merging, `validateConfig()`, `CategoryRegistry`, `detectGitHubToken()`
- **Event system** (`src/events/`): `EventBusImpl` with typed `emit()`, `on()`, `once()` + `createCapturingEventBus()` test helper
- **FileSystem adapter** (`src/fs/`): `NodeFileSystem` (production) and `InMemoryFileSystem` (testing) + `createMemoryFs(seed)` factory
- **Agent system** (`src/agents/`):
  - 39 YAML agent definitions (10 universal, 29 non-universal)
  - `src/agents/definitions/compile.ts` pipeline: YAML -> TypeScript code generation
  - `AgentRegistryImpl`: `getAll()`, `get()`, `getUniversalAgents()`, `isUniversal()`, `getDir()`, `detectInstalled()`, `register()`
- Core systems tests: 30 tests across 4 test files

### Technical Decisions
- Single npm package (no monorepo, no CLI)
- ESM-only, Node 20+, TypeScript strict mode
- `Result<T, E>` over exceptions for error handling
- Branded types for domain safety
- Composition root pattern via factory function
- Typed EventBus for observability
- In-memory FS adapter for deterministic testing
- YAML agent definitions compiled to TypeScript at build time
