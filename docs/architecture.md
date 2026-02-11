# Architecture

Internal architecture overview of the `@synapsync/agent-sync-sdk` package.

## Overview

The SDK follows a layered architecture with a composition root pattern. All dependencies are assembled in the `createAgentSyncSDK()` factory, which wires together all subsystems and returns the public `AgentSyncSDK` interface.

## Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AgentSyncSDK                      │
│                  (Public Facade)                    │
├─────────────────────────────────────────────────────┤
│                    Operations                       │
│  add | remove | list | find | update | sync | check | init  │
├──────────────┬──────────────┬───────────────────────┤
│   Installer  │ Lock Manager │  Discovery Service    │
│              │              │  Scanner -> Parser ->  │
│              │              │  Validator -> Filter   │
├──────────────┴──────────────┴───────────────────────┤
│          Provider Registry + Source Parser           │
│  GitHub | Local | Mintlify | HuggingFace | WellKnown | DirectURL │
├─────────────────────────────────────────────────────┤
│             Agent Registry + Config                 │
│         39 agents | cognitive types | paths         │
├─────────────────────────────────────────────────────┤
│           Event Bus + File System Adapter           │
│         27 events | NodeFS / InMemoryFS             │
└─────────────────────────────────────────────────────┘
```

## Layers

### Layer 1: Foundation -- Config + Events + FileSystem

- **`EventBusImpl`** -- In-memory pub/sub implementing the `EventBus` interface.
- **`resolveConfig()`** -- Merges user config with defaults.
- **`NodeFileSystem`** -- Real filesystem adapter wrapping Node.js `fs/promises`.
- **`createMemoryFs()`** -- In-memory filesystem for testing.
- All other layers receive these via dependency injection.

### Layer 2: Agent Registry

- **`AgentRegistryImpl`** -- Manages 39 auto-generated agent configs plus custom agents.
- Agent configs are generated at build time from YAML definitions via `src/agents/compile/compile.ts`.
- Each agent defines: `name`, `displayName`, `localRoot`, `globalRoot`, detect rules, and dirs per cognitive type.
- Universal agents use `.agents` as `localRoot`; non-universal agents use agent-specific directories (e.g., `.cursor`).

### Layer 3: Provider Registry + Source Parser

- **`ProviderRegistryImpl`** -- Holds providers in priority order, first-match-wins.
- **`SourceParserImpl`** -- Parses source strings into `SourceDescriptor` objects.
- **`GitClientImpl`** -- Wraps `simple-git` for git clone operations.
- 7 built-in providers registered in order: Custom, GitHub, Local, Mintlify, HuggingFace, WellKnown, DirectURL.
- Source resolution flow: source string -> `SourceParser` -> `ProviderRegistry.findProvider()` -> `HostProvider.fetchAll()`.

### Layer 4: Discovery Service

- Pipeline: Scanner -> Parser -> Validator -> Filter.
- **`Scanner`** -- Walks the directory tree finding cognitive files (`SKILL.md`, `AGENT.md`, `PROMPT.md`, `RULE.md`).
- **`CognitiveParser`** -- Parses YAML frontmatter and markdown content using `gray-matter`.
- **`Validator`** -- Validates cognitive structure (required fields: `name`, `description`).
- **`Filter`** -- Applies type/name filters from options.
- Emits `discovery:start`, `discovery:found`, and `discovery:complete` events.

### Layer 5: Installer + Lock Manager

- **`InstallerImpl`** -- Handles installation of cognitives to agent directories.
  - Canonical path: `.agents/cognit/{type}/{category}/{name}/` -- single source of truth.
  - Agent symlinks: `.{agent}/{type}/{name}/` -> canonical path.
  - Fallback to copy if symlink fails (e.g., on Windows or across filesystems).
- **`LockFileManagerImpl`** -- Manages `.agents/cognit/.cognit-lock.json`.
  - v5 schema with atomic writes (write to temp file, then rename).
  - Auto-migration from older versions.
  - Tracks: `source`, `sourceType`, `sourceUrl`, `contentHash`, `cognitiveType`, timestamps.
  - Lock key format: `"{cognitiveType}:{name}"` (e.g., `"skill:react-best-practices"`).

### Layer 6: Operations

Each operation is an independent class receiving an `OperationContext`.

**OperationContext** contains: `agentRegistry`, `providerRegistry`, `sourceParser`, `gitClient`, `discoveryService`, `installer`, `lockManager`, `eventBus`, `config`.

| Operation         | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `AddOperation`    | Resolve source, fetch cognitives, install canonical + symlinks, update lock. |
| `RemoveOperation` | Remove symlinks from agents, remove canonical directory, remove lock entry.  |
| `ListOperation`   | Read lock file, return installed cognitives.                                 |
| `FindOperation`   | Resolve source, discover available cognitives, mark installed ones.          |
| `UpdateOperation` | Compare content hashes, re-fetch changed cognitives, re-install.             |
| `SyncOperation`   | Verify symlink integrity, fix broken links, reconcile lock with filesystem.  |
| `CheckOperation`  | Health check: verify canonical dirs, symlinks, hashes, lock consistency.     |
| `InitOperation`   | Scaffold new cognitive file with frontmatter template.                       |

All operations return `Result<T, CognitError>` and emit operation lifecycle events.

## Composition Root Pattern

The `createAgentSyncSDK()` factory performs the following steps in order:

1. Resolves config (merges defaults).
2. Creates `EventBus`.
3. Creates `AgentRegistry` (loads generated + additional agents).
4. Creates `ProviderRegistry` (registers custom + built-in providers).
5. Creates `SourceParser`.
6. Creates `GitClient`.
7. Creates `DiscoveryService`.
8. Creates `Installer`.
9. Creates `LockManager`.
10. Creates all 8 Operation instances.
11. Returns the public `AgentSyncSDK` facade that delegates to operations.

## Installation Flow

```
sdk.add("owner/repo", { agents: ["cursor", "claude-code"] })
  |
  +-- 1. Source Resolution
  |    SourceParser.parse("owner/repo") -> SourceDescriptor { kind: 'github', ... }
  |    ProviderRegistry.findProvider() -> GitHubProvider
  |    GitHubProvider.fetchAll() -> RemoteCognitive[]
  |
  +-- 2. Canonical Installation
  |    For each cognitive:
  |      Write to .agents/cognit/{type}/{category}/{name}/{FILE}.md
  |
  +-- 3. Agent Symlinks
  |    For each target agent:
  |      .cursor/{type}/{name}/ -> symlink -> .agents/cognit/{type}/{category}/{name}/
  |      .claude/{type}/{name}/ -> symlink -> .agents/cognit/{type}/{category}/{name}/
  |
  +-- 4. Lock Update
       addEntry("{type}:{name}", { source, contentHash, ... })
       Write .agents/cognit/.cognit-lock.json atomically
```

## Lock File System

- **Location**: `.agents/cognit/.cognit-lock.json`
- **Schema version**: 5 (`LOCK_VERSION` constant)
- **Migration**: Auto-migrates older versions on read, emits `lock:migrate` event.
- **Atomic writes**: Writes to a temp file, then renames to prevent corruption.
- **Key format**: `"{cognitiveType}:{name}"` (e.g., `"skill:react-best-practices"`).
- **Content hashing**: SHA-256 of cognitive file content for change detection.

## File System Abstraction

Two implementations of the `FileSystemAdapter` interface:

| Implementation     | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `NodeFileSystem`   | Wraps `node:fs/promises` for real filesystem operations.  |
| `createMemoryFs()` | In-memory implementation for testing (used by 458 tests). |

## Directory Structure

```
project/
├── .agents/
│   └── cognit/
│       ├── .cognit-lock.json           # Lock file
│       ├── skills/
│       │   └── general/
│       │       └── my-skill/
│       │           └── SKILL.md        # Canonical source
│       ├── agents/
│       ├── prompts/
│       └── rules/
├── .cursor/                            # Cursor agent
│   └── skills/
│       └── my-skill/ -> ../../.agents/cognit/skills/general/my-skill/  # Symlink
├── .claude/                            # Claude Code agent
│   └── skills/
│       └── my-skill/ -> ../../.agents/cognit/skills/general/my-skill/  # Symlink
└── ...
```

## See Also

- [API Reference](./api-reference.md)
- [Type System](./type-system.md)
- [Providers](./providers.md)
- [Events](./events.md)
