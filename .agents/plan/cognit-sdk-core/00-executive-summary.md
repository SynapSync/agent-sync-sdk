# 00 - Executive Summary: Cognit SDK Core

**Author:** Agent D -- Implementation Planner
**Date:** 2026-02-09
**Status:** Plan

---

## Vision Statement

Build a **complete, interface-agnostic SDK** for managing "cognitives" (skills, prompts, rules, agents) across 39+ AI coding agents. The SDK is the single source of truth for all cognitive operations -- any CLI, web app, or integration consumes it. The SDK handles all logic; consumers handle all presentation.

**First the SDK, then the CLI. Never the other way around.**

---

## What the SDK Is

- A **TypeScript library** (`@synapsync/cognit-core`) that provides a programmatic API for installing, updating, listing, removing, and syncing cognitives
- A **strongly-typed, interface-agnostic** core that returns structured data and emits typed events
- An **extensible system** supporting custom providers, custom agents (via YAML), and custom cognitive types
- The **foundation** on which any CLI, web UI, or integration is built

## What the SDK Is Not

- NOT a CLI (the CLI is a separate thin wrapper package)
- NOT a UI framework (no colors, spinners, prompts, or terminal output)
- NOT coupled to any hosting platform (no Vercel telemetry, no `skills.sh` dependency)
- NOT a fork of `vercel-labs/skills` (clean architecture, own codebase, shared SKILL.md format standard)

---

## Architecture Overview

The SDK uses a strict **6-layer architecture** with dependency injection and no singletons:

```
Layer 0: Types & Errors       (pure types, zero dependencies)
Layer 1: Config & Events       (SDK configuration, event bus)
Layer 2: Agents & Registry     (agent definitions, detection)
Layer 3: Discovery & Providers (filesystem scanning, remote fetching)
Layer 4: Lock & Installer      (lock file management, file operations)
Layer 5: Operations            (add, remove, list, update, sync, check, init, find)
Layer 6: Public API            (SDK facade, factory function)
```

Each layer may only import from layers below it. Every module depends on interfaces, not implementations. All filesystem I/O goes through an injectable `FileSystemAdapter`, making the entire SDK testable with an in-memory filesystem.

The single entry point is `createCognitSDK(config?)`, which wires all dependencies and returns a `CognitSDK` instance.

**Reference:** `01-architecture.md`

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **SDK-first, not CLI-first** | SDK is the core; CLI is a thin consumer | Enables web UIs, integrations, SDKs in other languages |
| **DI over singletons** | Constructor injection via composition root | Testable, parallelizable, explicit dependencies |
| **Result over exceptions** | `Result<T, E>` for expected failures | Explicit error handling, composable, no try/catch needed |
| **Events over console.log** | Typed event bus for all observability | Decoupled from UI, multiple listeners, composable |
| **YAML agents, compiled to TS** | Agent definitions as data, not code | Adding an agent = adding a YAML file, not writing TypeScript |
| **In-memory FS for tests** | `FileSystemAdapter` interface | Fast, deterministic, parallel-safe tests |
| **Categories in canonical, flat in agents** | `.agents/cognit/skills/frontend/react-19/` canonical, `.claude/skills/react-19/` for agent | Organization without breaking agent compatibility |
| **Symlink default, copy fallback** | Single source of truth with links | Disk-efficient, update propagation, drift detection |
| **ESM-only, Node >= 20** | No CommonJS, no dual build | Modern baseline, simpler tooling |
| **Monorepo: 2 packages** | `cognit-core` (SDK) + `cognit-cli` (CLI) | Clean separation, independent versioning |

---

## Module Inventory

| Module | Layer | Purpose | Key Interfaces |
|--------|-------|---------|----------------|
| `types/` | 0 | All TypeScript types, branded types, result utilities | `Cognitive`, `AgentConfig`, `HostProvider`, `Result<T,E>` |
| `errors/` | 0 | Typed error hierarchy | `CognitError`, `ProviderError`, `InstallError`, `LockError` |
| `config/` | 1 | SDK configuration resolution and validation | `SDKConfig`, `resolveConfig()` |
| `events/` | 1 | Typed event emission and subscription | `EventBus`, `SDKEventMap` |
| `fs/` | 0-1 | Filesystem abstraction (real + in-memory) | `FileSystemAdapter` |
| `agents/` | 2 | Agent registry, detection, YAML-compiled configs | `AgentRegistry`, `AgentDetector` |
| `discovery/` | 3 | Filesystem scanning for cognitive files | `DiscoveryService` |
| `source/` | 3 | Source string parsing and git operations | `SourceParser`, `GitClient` |
| `providers/` | 3 | Remote host providers (GitHub, Mintlify, etc.) | `HostProvider`, `ProviderRegistry` |
| `installer/` | 4 | File installation (symlink/copy, paths, security) | `Installer`, `FileOperations` |
| `lock/` | 4 | Lock file CRUD, migration, hashing | `LockManager` |
| `operations/` | 5 | SDK operations (add, list, remove, etc.) | `AddOperation`, `ListOperation`, etc. |
| `sdk.ts` | 6 | Public facade and composition root | `CognitSDK`, `createCognitSDK()` |

**Reference:** `03-modules.md`

---

## Implementation Phases

| Phase | Name | Description | Key Deliverables | Dependencies |
|-------|------|-------------|------------------|--------------|
| **0** | Project Setup | Monorepo, configs, build pipeline | pnpm workspace, tsconfig, vitest, tsup | -- |
| **1** | Types & Errors | All types, branded types, error hierarchy | 22 type/error files | P0 |
| **2** | Agent System | YAML defs, compile script, registry | 39+ YAML files, compile pipeline, AgentRegistryImpl | P1 |
| **3** | Config, Events, FS | Configuration, event bus, FS adapter | resolveConfig, EventBusImpl, createMemoryFs | P1 |
| **4** | Discovery | Filesystem scanning, frontmatter parsing | DiscoveryServiceImpl, parser, scanner | P1, P3 |
| **5** | Source & Git | Source string parsing, git clone | SourceParserImpl, GitClientImpl | P1, P3 |
| **6** | Providers (core) | Provider registry, GitHub, Local | ProviderRegistryImpl, GitHubProvider, LocalProvider | P1, P3, P5 |
| **7** | Installer | Unified installer, file ops, paths, symlinks | InstallerImpl, FileOperationsImpl, path utilities | P1, P2, P3 |
| **8** | Lock System | Lock file CRUD, migration, hashing | LockManagerImpl, migration, computeContentHash | P1, P3 |
| **9** | Operations | All 8 SDK operations | AddOperation through FindOperation | P2-P8 |
| **10** | Public API | SDK facade, composition root, exports | createCognitSDK, CognitSDKImpl, index.ts | All |
| **11** | Additional Providers | Mintlify, HuggingFace, WellKnown, Direct | 4 provider implementations | P6 |
| **12** | Testing | Integration, E2E, coverage gates | 40+ test files, 85% coverage | All |
| **13** | CLI Package | Commands, prompts, formatters | cognit add/list/remove/update/sync/check/init/find | P10 |

**Reference:** `11-implementation-roadmap.md`

---

## What Makes This Different From vercel-labs/skills

| Aspect | vercel-labs/skills | Cognit SDK |
|--------|-------------------|------------|
| **Architecture** | CLI-only binary, no programmatic API | SDK-first with CLI as thin consumer |
| **Agent Config** | Hard-coded TypeScript per agent | YAML definitions compiled to TypeScript |
| **Cognitive Types** | Skills only (SKILL.md) | Skills, Prompts, Rules, Agents (extensible) |
| **Categories** | None | First-class organizational departments |
| **Lock File** | Global only, flat keys | Project + global scopes, composite keys with category |
| **Testability** | No FS abstraction, singletons | Full DI, injectable FS, in-memory testing |
| **Extensibility** | Fork to customize | Custom providers, custom agents, custom types via config |
| **Installation** | Always global | Project-scoped (default) + global |
| **Infrastructure** | Coupled to Vercel (telemetry, search) | Fully independent, configurable endpoints |
| **Error Handling** | console.log + process.exit | Typed error hierarchy + Result<T,E> |
| **Observability** | Console output | Typed event bus for any consumer |

The only shared elements are: the **SKILL.md frontmatter format** (adopted as a standard, not as code) and the **39 agent definitions** (ported as YAML data, not as TypeScript code).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js >= 20 | Execution environment |
| Language | TypeScript (strict mode) | Type safety |
| Module System | ESM-only | Modern standard |
| Package Manager | pnpm | Workspace support |
| Build Tool | tsup | Bundling + dts generation |
| Test Framework | vitest | Fast, ESM-native |
| Frontmatter | gray-matter | YAML frontmatter parsing |
| Git | simple-git | Git clone operations |
| XDG Paths | xdg-basedir | Cross-platform config paths |
| CLI Prompts | @clack/prompts | Interactive terminal prompts (CLI only) |
| CLI Colors | picocolors | Terminal color output (CLI only) |
| CLI Spinner | ora | Progress spinner (CLI only) |

**Runtime dependencies (SDK):** 3 (`gray-matter`, `simple-git`, `xdg-basedir`)
**Runtime dependencies (CLI):** 3 additional (`@clack/prompts`, `picocolors`, `ora`)

---

## Plan Document Index

| # | Document | Author | Contents |
|---|----------|--------|----------|
| **00** | **Executive Summary** (this document) | Agent D | Vision, architecture, decisions, phases, tech stack |
| **01** | [Architecture](./01-architecture.md) | Agent A | Layered architecture, DI, events, config, FS adapter, public API, data flow |
| **02** | [Type System](./02-type-system.md) | Agent A | Branded types, Result, cognitive types, agent types, provider types, installer types, lock types, operation types, event types, error hierarchy |
| **03** | [Module Breakdown](./03-modules.md) | Agent A | 12 modules with dependencies, public/internal APIs, file structures, testing strategies, LOC estimates |
| **04** | [Agent System](./04-agent-system.md) | Agent B | YAML schema, examples (39+ agents), compile pipeline, detection rules, compatibility groups |
| **05** | [Provider System](./05-provider-system.md) | Agent B | HostProvider interface, 7 providers, registry, source parsing, caching, error handling |
| **06** | [Operations](./06-operations.md) | Agent B | 8 operations (add, list, remove, update, sync, init, check, find), algorithms, events, error cases |
| **07** | [Installer](./07-installer.md) | Agent C | Install modes, scopes, canonical paths, symlinks, security, rollback, Windows support |
| **08** | [Lock System](./08-lock-system.md) | Agent C | Lock schema v5, CRUD, update detection, migration, conflict resolution |
| **09** | [Directory Structure](./09-directory-structure.md) | Agent C | Monorepo layout, runtime dirs, cognitive file schemas, build output, npm publish structure |
| **10** | [Category System](./10-categories.md) | Agent C | Default categories, custom categories, flattening, lock integration, querying |
| **11** | [Implementation Roadmap](./11-implementation-roadmap.md) | Agent D | 14 phases with files, interfaces, tests, acceptance criteria, dependencies |
| **12** | [Testing Strategy](./12-testing-strategy.md) | Agent D | Unit/integration/E2E strategy, fixtures, mocks, coverage targets, CI |

---

## How to Use This Plan

Each phase in the implementation roadmap (`11-implementation-roadmap.md`) is designed to be executed by a Claude agent. The instructions include:

1. **Exact files to create** with full paths
2. **Interfaces to implement** with references to the type system document
3. **Tests to write** with specific test cases
4. **Definition of done** with acceptance criteria
5. **Dependencies** on other phases

Start at Phase 0 and proceed sequentially. Phases that share the same dependency set can be parallelized (e.g., Phases 4, 5, and 6 can run in parallel after Phase 3).

The user's directive: **"I don't care about time -- I want it done 100% right."** This plan is designed for completeness and correctness, not speed.
