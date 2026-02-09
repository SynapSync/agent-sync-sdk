# Changelog

All notable changes to the `@synapsync/agent-sync-sdk` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - `compile-agents.ts` pipeline: YAML -> TypeScript code generation
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
