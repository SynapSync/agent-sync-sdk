# Synapse-CLI Analysis Report

**Repository:** `/Users/rperaza/joicodev/owned/SynapSync/projects/synapse-cli`
**Package:** `@synapsync/cli` v0.1.10
**Date:** 2026-02-09
**Investigator:** Agent C

---

## 1. Original Vision

### 1.1 Core Concept: "Neural AI Orchestration Platform"

Synapse-CLI was conceived as a **cognitive management platform** -- a package-manager-like tool for AI instructions (skills, agents, prompts, workflows, tools) that could be installed, organized, and synced across multiple AI providers (Claude, OpenAI, Cursor, Windsurf, Copilot, Gemini).

The key insight was treating AI instructions as first-class, versionable, shareable "cognitives" with:

- A **central registry** (GitHub-based, static files) for discovery and installation
- A **manifest-based tracking system** (similar to `package.json` + `package-lock.json`)
- **Symlink-based synchronization** to provider directories (`.claude/`, `.cursor/`, etc.)
- **Multiple installation sources**: registry, local path, GitHub repos
- **YAML-based configuration** (`synapsync.config.yaml`)

### 1.2 Interaction Model

The CLI supported **two interaction modes**:

1. **Standard CLI** via Commander.js (`synapsync init`, `synapsync add`, etc.)
2. **Interactive REPL** mode (launched when no command is given) with `/command` syntax

The REPL was a distinctive feature -- a readline-based loop with 17 commands, declarative argument parsing, a command registry, and help system. This was decomposed from a monolithic 688-line file into 8 focused modules (`src/ui/repl/`).

### 1.3 Cognitive Types

Five cognitive types were defined (`src/core/constants.ts:10`):

| Type | File | Sync Mode | Description |
|------|------|-----------|-------------|
| `skill` | `SKILL.md` | folder | Reusable instruction sets (may have assets/) |
| `agent` | `AGENT.md` | file | Autonomous entities with behaviors |
| `prompt` | `PROMPT.md` | file | Template prompts with variables |
| `workflow` | `WORKFLOW.yaml` | file | Multi-step orchestrated processes |
| `tool` | `TOOL.md` | file | External integrations |

### 1.4 Provider Support

Six providers were targeted (`src/core/constants.ts:78-85`):

| Provider | Status | Sync Path |
|----------|--------|-----------|
| Claude | Supported | `.claude/skills/`, `.claude/agents/`, etc. |
| OpenAI | Supported | `.openai/skills/`, etc. |
| Cursor | Supported | `.cursor/skills/`, etc. |
| Windsurf | Supported | `.windsurf/skills/`, etc. |
| Copilot | Supported | `.github/skills/`, etc. |
| Gemini | Planned | `.gemini/skills/`, etc. |

Each provider had per-cognitive-type path mappings (`src/core/constants.ts:89-132`).

---

## 2. Architecture Analysis

### 2.1 Project Structure

```
src/
  index.ts              # Entry point - calls runCLI()
  cli.ts                # Commander.js setup, 15 commands registered
  version.ts            # Dynamic version from package.json

  commands/             # 15 CLI command implementations
    init.ts             # Project initialization with @clack/prompts
    add.ts              # Install from registry/local/GitHub (696 lines)
    list.ts             # List installed/remote cognitives
    sync.ts             # Filesystem-manifest-provider sync
    config.ts           # YAML config management
    status.ts           # Project status display
    providers.ts        # Provider enable/disable/path
    uninstall.ts        # Remove cognitives
    update.ts           # Update cognitives from registry
    doctor.ts           # Diagnostic health checks
    clean.ts            # Cache/orphan cleanup
    purge.ts            # Complete SynapSync removal
    help.ts             # Help display
    version.ts          # Version display
    info.ts             # Concept explanations

  services/             # Core business logic
    config/
      manager.ts        # YAML config read/write with dot-notation access
      schema.ts         # Config validation, defaults, nested value utils
    registry/
      client.ts         # HTTP client for GitHub-hosted static registry
    manifest/
      manager.ts        # manifest.json CRUD, reconciliation
      types.ts          # Manifest types
    scanner/
      scanner.ts        # Filesystem scanner for cognitives
      parser.ts         # YAML frontmatter parser (custom, not using yaml lib)
      types.ts          # Scanner types
    sync/
      engine.ts         # 4-phase sync: scan -> compare -> reconcile -> symlink
      types.ts          # Sync types
    symlink/
      manager.ts        # Symlink/copy creation with Windows fallback
      types.ts          # Symlink types
    maintenance/
      doctor.ts         # 8 diagnostic checks with auto-fix
      cleaner.ts        # Cache/orphan/temp cleanup
      update-checker.ts # Version comparison for updates
      types.ts          # Maintenance types
    cognitive/
      detector.ts       # Multi-strategy cognitive type detection
      prompter.ts       # Interactive type selection prompts
      types.ts          # Detection types
    agents-md/
      generator.ts      # AGENTS.md auto-generation with markers
      types.ts          # Generator types

  ui/
    banner.ts           # Welcome banner with quick start
    logo.ts             # ASCII art logo
    colors.ts           # Color utilities
    repl.ts             # Re-exports from repl/
    repl/
      types.ts          # REPL type definitions (CommandDef, FlagDef, ParsedArgs)
      arg-parser.ts     # Declarative argument parser
      registry.ts       # Command registry
      commands.ts       # 17 REPL command registrations
      dispatcher.ts     # Input routing
      help.ts           # Help system
      loop.ts           # Readline event loop
      index.ts          # Barrel with side-effect imports

  utils/
    logger.ts           # Centralized logger with picocolors + ora spinners

  core/
    constants.ts        # All constants: types, paths, categories, providers

  types/
    index.ts            # All TypeScript interfaces (267 lines)
```

**Total source files:** 64 `.ts` files
**Total test files:** 34 `.test.ts` files

### 2.2 Dependency Stack

**Runtime Dependencies (5):**
| Package | Purpose |
|---------|---------|
| `commander` v14 | CLI framework / command parsing |
| `@clack/prompts` v1 | Interactive prompts (init wizard) |
| `ora` v9 | Terminal spinners |
| `picocolors` v1 | Terminal color output |
| `yaml` v2 | YAML config file parsing |

**Dev Dependencies (8):**
| Package | Purpose |
|---------|---------|
| `tsup` v8 | Build tool (ESM, single entry) |
| `typescript` v5.9 | Type checking |
| `vitest` v4 | Test framework |
| `@vitest/coverage-v8` | Coverage provider |
| `eslint` v9 | Linting |
| `@typescript-eslint/*` v8.54 | TS ESLint rules |
| `eslint-config-prettier` v10 | Prettier compat |
| `prettier` v3.8 | Code formatting |

**Notable:** Extremely lean runtime footprint -- only 5 dependencies. No AI SDK dependencies in production (those were considered for the Execution Engine idea).

### 2.3 Build Configuration

**tsup** (`tsup.config.ts`): Single ESM entry, Node 20 target, sourcemaps, DTS generation, shebang banner.

**TypeScript** (`tsconfig.json`): Maximum strict mode -- every strict flag enabled, including `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`.

**ESLint** (`eslint.config.js`): Extremely strict -- no `any`, `no-unsafe-*` rules, explicit return types, strict boolean expressions, floating promise detection.

### 2.4 Test Infrastructure

**Vitest** (`vitest.config.ts`): Node environment, v8 coverage provider, 60% branch / 70% function/line thresholds.

**Coverage achieved:** 80% lines, 71% branches, 75% functions across 515 tests in 33 files. Key services at 83-100% coverage.

**Test structure mirrors src/:**
```
tests/unit/
  commands/    # All 14 commands tested
  services/    # All services tested
  ui/          # Banner, colors, logo, REPL modules tested
  utils/       # Logger tested
  version.test.ts
```

### 2.5 Key Architectural Patterns

1. **Command-Service Separation**: Commands in `src/commands/` are thin wrappers that parse options and delegate to services.

2. **Static Factory Pattern**: `ConfigManager.findConfig()` walks up directories to find config (like how git finds `.git`).

3. **4-Phase Sync Engine** (`src/services/sync/engine.ts`):
   - Phase 1: Scan filesystem for cognitives
   - Phase 2: Compare scanned vs manifest
   - Phase 3: Reconcile manifest (add/update/remove)
   - Phase 4: Create symlinks in provider directories

4. **AGENTS.md Auto-Generation**: Marker-based (`<!-- synapsync:start -->` / `<!-- synapsync:end -->`) content injection that preserves user content outside markers.

5. **Multi-Strategy Type Detection** (`src/services/cognitive/detector.ts`): Flag -> Registry -> Local files -> GitHub API -> Interactive prompt fallback.

6. **Progress Callbacks**: Sync engine reports progress via callbacks for UI feedback.

---

## 3. Reusable Components

### 3.1 High-Value Components (Direct Reuse)

| Component | Location | Lines | Value |
|-----------|----------|-------|-------|
| **Logger utility** | `src/utils/logger.ts` | 175 | Production-ready logger with icons, spinners, sections, labels. Zero-config. |
| **Argument parser** | `src/ui/repl/arg-parser.ts` | 30 | Elegant declarative flag parser. Compact and well-tested. |
| **Config dot-notation access** | `src/services/config/schema.ts:181-220` | 40 | `getNestedValue`/`setNestedValue` utilities for object path access. |
| **YAML frontmatter parser** | `src/services/scanner/parser.ts` | 155 | Custom parser handles key:value, arrays, inline arrays, quotes. No dependency. |
| **Content hash utility** | `src/services/scanner/scanner.ts:221-223` | 3 | SHA-256 truncated hash for change detection. |
| **AGENTS.md generator** | `src/services/agents-md/generator.ts` | 305 | Marker-based content injection pattern. Preserves user content. |
| **Source parser** | `src/services/cognitive/detector.ts:38-72` | 35 | Parses `registry:`, `github:`, local path, URL sources. |
| **Date formatter** | `src/commands/list.ts:377-394` | 18 | Relative date formatting (today, yesterday, N days ago, N weeks ago). |
| **Byte formatter** | `src/commands/clean.ts:165-173` | 9 | Human-readable file size formatting. |

### 3.2 Medium-Value Components (Adapt/Inspire)

| Component | Location | Lines | Value |
|-----------|----------|-------|-------|
| **Symlink manager** | `src/services/symlink/manager.ts` | 497 | Symlink/copy with Windows fallback, verification, orphan cleanup. Cognit's symlink needs differ but the fallback pattern is valuable. |
| **Config validation** | `src/services/config/schema.ts:105-171` | 67 | Structural YAML config validation. Pattern is reusable. |
| **Doctor service** | `src/services/maintenance/doctor.ts` | 506 | Diagnostic framework with fixable checks. Architecture pattern is strong. |
| **REPL system** | `src/ui/repl/` | ~300 | Modular REPL: registry, dispatcher, loop, help. Pattern could inform interactive mode in cognit. |
| **GitHub file fetcher** | `src/commands/add.ts:447-461` | 15 | Raw GitHub content download utility. |
| **Multi-source install** | `src/commands/add.ts` | 696 | Registry/local/GitHub install pipeline. Complex but proven. |

### 3.3 Test Infrastructure

| Component | Files | Tests | Value |
|-----------|-------|-------|-------|
| Command tests | 14 files | ~200 | Complete command coverage with mocked services |
| Service tests | 10 files | ~200 | Scanner, parser, registry, symlink, manifest, sync engine |
| UI tests | 5 files | ~50 | Banner, colors, logo, REPL modules |
| Utility tests | 1 file | ~15 | Logger |

The test patterns (mocking fs, fetch, process.cwd) are directly applicable to cognit testing.

---

## 4. Gap Analysis

### 4.1 Synapse-CLI vs Cognit vs Upstream (Vercel Skills)

| Feature | Synapse-CLI | Cognit (Fork) | Upstream (Vercel Skills) |
|---------|-------------|---------------|--------------------------|
| **CLI Framework** | Commander.js | Commander.js (from fork) | Likely minimal or none |
| **Cognitive Types** | 5 (skill, agent, prompt, workflow, tool) | Skill-focused (from fork) | Skills only |
| **Provider Support** | 6 providers (Claude, OpenAI, Cursor, Windsurf, Copilot, Gemini) | TBD | Single provider likely |
| **Registry** | GitHub-based static registry with client | TBD | npm-style? |
| **Install Sources** | Registry + Local + GitHub | TBD | TBD |
| **Sync Mechanism** | Symlinks with copy fallback, 4-phase engine | TBD | TBD |
| **Config Format** | YAML (`synapsync.config.yaml`) | TBD | TBD |
| **Interactive Mode** | Full REPL with 17 commands | TBD | None expected |
| **Manifest** | JSON manifest with reconciliation | TBD | TBD |
| **Maintenance** | doctor, clean, update, purge commands | TBD | TBD |
| **AGENTS.md** | Auto-generated with markers | TBD | None |
| **Execution Engine** | Proposed, not implemented | TBD | TBD |
| **Publishing** | Proposed, not implemented | TBD | TBD |
| **Testing** | 515 tests, 80% coverage | TBD | TBD |
| **TypeScript Strictness** | Maximum (all strict flags) | TBD | TBD |
| **Dependencies** | 5 runtime deps | TBD (fork-based, heavier) | TBD |
| **Build Tool** | tsup (single ESM bundle) | TBD | TBD |

### 4.2 Feature Overlap Matrix

| Synapse-CLI Feature | Present in Cognit? | Worth Porting? | Notes |
|---------------------|-------------------|----------------|-------|
| Multi-provider sync | Unknown | YES | Core differentiator from upstream |
| Registry client | Unknown | MAYBE | Depends on registry strategy |
| REPL interactive mode | Unknown | MAYBE | Nice DX but not essential |
| Doctor diagnostics | Unknown | YES | Health checks are universally valuable |
| AGENTS.md generator | Unknown | YES | Unique value-add for project organization |
| Frontmatter parser | Unknown | YES | Lightweight, zero-dep alternative |
| Cognitive type system | Partially | ADAPT | 5 types vs skills-only: decide scope |
| Purge command | Unknown | YES | Clean uninstall is important |
| YAML config | Unknown | EVALUATE | vs JSON or JS config |
| Symlink management | Unknown | YES | Core sync mechanism |
| GitHub install | Unknown | YES | Direct repo installation |
| Content hashing | Unknown | YES | Change detection for sync |

---

## 5. Why It Fell Short

### 5.1 Missing Critical Features

1. **No Execution Engine**: Skills could be installed and synced but not *executed*. Users still needed to open Claude/Cursor/ChatGPT to use them. The Execution Engine was documented (`docs/ideas/execution-engine.md`) with detailed architecture but never implemented.

2. **No Publishing System**: Contributing to the registry required manual GitHub PRs. No `synapsync publish` command existed. The backend infrastructure was not built.

3. **No Version Pinning**: The registry only stored the latest version of each cognitive. No lock file for reproducible installs.

4. **Limited Registry**: The registry was a static GitHub repo (`synapse-registry`). No search API, no download counting, no dependency resolution.

### 5.2 Scale and Ecosystem Issues

1. **Cold Start Problem**: The registry needed content to attract users, but needed users to attract contributors. Starting from scratch with a custom ecosystem is extremely difficult.

2. **Provider Path Assumptions**: Hardcoded provider paths (`src/core/constants.ts:89-132`) assumed specific directory structures that may not match actual provider conventions. For example, Claude Code uses `.claude/commands/`, not `.claude/skills/`.

3. **Cognitive Type Complexity**: Five cognitive types with different file formats, sync modes, and detection strategies added significant complexity. The upstream Vercel Skills project takes a simpler approach.

### 5.3 Technical Limitations

1. **Custom Frontmatter Parser**: The hand-rolled YAML frontmatter parser (`src/services/scanner/parser.ts`) was functional but limited compared to established libraries. It couldn't handle nested objects, multiline strings, or complex YAML.

2. **No Dependency Resolution**: Cognitives couldn't declare dependencies on other cognitives. No DAG resolution.

3. **Sync State Management**: The manifest reconciliation was file-based and could drift. No transactional guarantees.

4. **No Watch Mode**: No filesystem watcher for automatic re-sync when cognitives change.

### 5.4 Strategic Reasons for Pivoting

The decision to adopt the Vercel fork (cognit) likely stemmed from:

1. **Existing Ecosystem**: Vercel Skills had an existing community and adoption path.
2. **Simpler Model**: Skills-only (vs 5 cognitive types) reduces complexity.
3. **Industry Alignment**: Following an established pattern (npm for skills) rather than inventing a new paradigm.
4. **Faster Time-to-Value**: Building on a working fork vs. building everything from scratch.

---

## 6. Lessons Learned

### 6.1 Good Design Decisions

1. **Lean Dependencies**: Only 5 runtime deps. This should be maintained in cognit. Avoid dependency bloat.

2. **Maximum TypeScript Strictness**: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc. caught real bugs (e.g., the `@clack/prompts` v1 undefined validator issue in the CHANGELOG).

3. **Service Layer Separation**: Clean separation of commands (UI) from services (logic). Commands are thin wrappers. This enables testing and reuse.

4. **Comprehensive CLI**: Every command had `--json`, `--dry-run`, `--verbose`, `--force` options where applicable. This consistency is excellent DX.

5. **REPL Decomposition**: Breaking the 688-line REPL into 8 focused modules was a good refactoring. The declarative argument parser pattern is elegant.

6. **Doctor/Clean/Purge**: Maintenance commands show maturity. Users need ways to diagnose, repair, and cleanly remove tools.

7. **Marker-Based AGENTS.md**: The `<!-- synapsync:start -->` / `<!-- synapsync:end -->` pattern for preserving user content around generated sections is clever and reusable.

8. **Multi-Source Install**: Supporting registry, local path, and GitHub as install sources covers all use cases.

### 6.2 Design Decisions to Avoid

1. **Too Many Cognitive Types Too Early**: Starting with 5 types (skill, agent, prompt, workflow, tool) before any were fully working was premature complexity. Start with one type (skills) and add others when needed.

2. **Static GitHub Registry**: Using raw GitHub files as a registry is fragile (rate limits, no search API, no auth). If a registry is needed, use npm or a proper backend.

3. **Custom YAML Frontmatter Parser**: The hand-rolled parser (`src/services/scanner/parser.ts`) was a maintenance burden. Use an established library like `gray-matter`.

4. **Hardcoded Provider Paths**: Provider directory structures change. Make paths fully configurable from the start, not hardcoded constants.

5. **REPL as Primary Mode**: The REPL was a significant engineering investment that most CLI users wouldn't use. Standard CLI-first, REPL-optional.

6. **Ambiguous "Cognitive" Terminology**: The term "cognitive" is not widely understood. "Skill" is clearer and aligns with industry terminology.

7. **YAML Config vs JSON**: YAML config required an extra dependency (`yaml` v2). JSON is natively supported and sufficient for most config needs.

### 6.3 Architectural Patterns to Preserve

1. **Config discovery pattern**: Walking up directories to find config (like git). `ConfigManager.findConfig()` at `src/services/config/manager.ts:41-55`.

2. **Progress callback pattern**: `SyncProgressCallback` in the sync engine for non-blocking UI updates.

3. **Reconciliation pattern**: The 4-phase sync (scan -> compare -> reconcile -> apply) is sound. The manifest manager's `reconcile()` + `applyReconciliation()` separation is clean.

4. **Error class hierarchy**: Custom error classes (`RegistryError`, `CognitiveNotFoundError`, `GitHubInstallError`, `ConfigValidationError`) with context fields.

5. **Conventional commit workflow**: Makefile-based release pipeline with version bump, build, test, tag, push.

---

## 7. Development History

The CHANGELOG reveals a well-paced development arc over ~2 weeks:

| Version | Date | Focus |
|---------|------|-------|
| 0.1.0 | 2026-01-27 | Foundation: CLI framework, core commands, config, registry |
| 0.2.0 | 2026-01-28 | Sync engine: manifest, scanner, symlinks, sync command |
| 0.3.0 | 2026-01-28 | Maintenance: doctor, clean, update commands |
| 0.4.0 | 2026-01-28 | Testing phase 2: 95 unit tests for core services |
| 0.5.0 | 2026-02-06 | Testing expansion: 515 tests, 80% coverage, REPL refactoring, CI/CD, dep updates |

The project reached production-readiness (per `docs/pre-production-review.md`) with ESLint clean, 80% coverage, 0 vulnerabilities, and all OSS files in place -- but was never published to npm.

---

## 8. Future Ideas (Documented but Unbuilt)

Three future features were documented in `docs/ideas/`:

1. **Execution Engine** (`docs/ideas/execution-engine.md`): Run cognitives via provider APIs directly from the CLI. Includes detailed architecture with provider adapters, credential storage (keytar), streaming, batch processing, and CI/CD integration. This is the most ambitious feature and the one most likely to differentiate cognit from upstream.

2. **Registry Publishing** (`docs/ideas/registry-publishing.md`): GitHub OAuth login, direct publish/unpublish commands, backend API. Estimated cost: $6-26/month for infrastructure.

3. **Export/Import** (`docs/ideas/export-import.md`): Export and import project configurations.

---

## 9. File Inventory Summary

| Category | Count | Key Files |
|----------|-------|-----------|
| Source files | 64 | `src/cli.ts`, `src/commands/*.ts`, `src/services/**/*.ts` |
| Test files | 34 | `tests/unit/**/*.test.ts` |
| Config files | 6 | `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `Makefile` |
| Documentation | 8 | `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/**/*.md` |
| Total TS lines | ~7,500 | Estimated across all source files |
| Total test lines | ~5,000 | Estimated across all test files |

---

## 10. Recommendations for Cognit Integration

### Must Port
- Logger utility (`src/utils/logger.ts`) -- universal value
- AGENTS.md generator pattern (`src/services/agents-md/generator.ts`) -- unique to SynapSync ecosystem
- Doctor/health check framework (`src/services/maintenance/doctor.ts`) -- project health
- Purge command (`src/commands/purge.ts`) -- clean uninstall

### Should Port (Adapted)
- Symlink management with fallback (`src/services/symlink/manager.ts`)
- Multi-source install: registry + local + GitHub (`src/commands/add.ts`)
- Sync engine's 4-phase pattern (`src/services/sync/engine.ts`)
- Config discovery (walk-up-directories) pattern
- Content hashing for change detection

### Consider Porting
- REPL system (nice DX but not critical)
- CLI option patterns (--json, --dry-run, --verbose everywhere)
- Test infrastructure and patterns

### Do Not Port
- 5-type cognitive system (keep it simple: skills first)
- Static GitHub registry client (use npm or proper backend)
- Custom YAML frontmatter parser (use gray-matter or similar)
- Hardcoded provider paths (make fully configurable)
- YAML config format (JSON or JS/TS config is simpler)
