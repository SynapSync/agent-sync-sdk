# MVP Plan: cognit-cli v0.1

> **Date**: 2026-02-09
> **Strategy**: Hybrid Architecture (Report 04)
> **Architecture**: See Report 05
> **Target**: Solo developer, sustainability-first

---

## 1. MVP Scope

### 1.1 In Scope (v0.1)

| Feature | Command | Priority | Source |
|---------|---------|----------|--------|
| Install cognitives from GitHub repos | `cognit add owner/repo` | P0 | Core value |
| Install from local paths | `cognit add ./path` | P0 | Core value |
| List installed cognitives | `cognit list` | P0 | Basic management |
| Remove installed cognitives | `cognit remove <name>` | P0 | Basic management |
| Scaffold new cognitive | `cognit init` | P1 | Author experience |
| Check for updates | `cognit check` | P1 | Maintenance |
| Update installed cognitives | `cognit update` | P1 | Maintenance |
| Diagnostic health checks | `cognit doctor` | P2 | DX polish |
| AGENTS.md generation | Automatic on install | P2 | DX polish |
| Three cognitive types | skill, agent, prompt | P0 | Core differentiator |
| YAML-based agent registry | 39 agents from YAML | P0 | Core architecture |
| Symlink-first installation | Symlink with copy fallback | P0 | Core mechanism |
| Lock file tracking | `.cognit-lock.json` | P0 | State management |
| Project + global scope | `--global` flag | P1 | Installation flexibility |

### 1.2 Out of Scope (and Why)

| Feature | Why Deferred |
|---------|-------------|
| **`cognit find` (search)** | Requires a search backend or API. GitHub search can be a v0.2 addition. Not needed for core value. |
| **Remote providers (Mintlify, HuggingFace, well-known)** | Edge cases. GitHub repos and local paths cover 90%+ of use cases. Providers are an adapter -- add later without architecture changes. |
| **Interactive REPL mode** | Synapse-CLI invested heavily here; low usage value. Standard CLI-first. |
| **Execution engine** | Ambitious feature from synapse-cli ideas. Requires AI provider API integration. v0.3+ at earliest. |
| **Publishing / registry** | Cold start problem. Focus on consumption first, production later. |
| **Config file (`synapsync.config.yaml`)** | Not needed until project-level customization is required. Defaults are enough for MVP. |
| **5 cognitive types (workflow, tool)** | Three types (skill/agent/prompt) cover the core use cases. Add workflow/tool if demand materializes. |
| **Windows support** | macOS/Linux first. Windows symlink handling is complex. Add in v0.2. |
| **Telemetry** | Ship first, measure later. Opt-in telemetry can be added post-MVP. |
| **Plugin system for providers** | Over-engineering. Hardcoded adapters are fine at this scale. |

### 1.3 Acceptance Criteria

1. `cognit add vercel-labs/skills` installs all SKILL.md files from a GitHub repo to detected agents
2. `cognit add ./local-skills/` installs cognitives from a local directory
3. Cognitive types (skill/agent/prompt) are correctly detected by filename (SKILL.md, AGENT.md, PROMPT.md)
4. 39 agents are supported via YAML definitions (matching upstream vercel-labs/skills parity)
5. Installed cognitives are symlinked to each detected agent's directory
6. `.cognit-lock.json` tracks all installations with source, version, and hash
7. `cognit list` shows all installed cognitives with type, source, and install date
8. `cognit remove <name>` cleanly removes a cognitive from all agent directories and lock file
9. `cognit init` scaffolds a new SKILL.md, AGENT.md, or PROMPT.md with proper frontmatter
10. `cognit doctor` runs at least 5 diagnostic checks (lock file integrity, symlink health, agent detection, etc.)
11. Test coverage >= 70% lines, 60% branches
12. Zero runtime dependencies beyond the 5 core libs (@clack/prompts, gray-matter, simple-git, picocolors, ora)

---

## 2. Milestones

### M0: Project Scaffolding (1-2 days)

**Deliverables:**
- [ ] Initialize `cognit-cli` project with `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`
- [ ] Set up ESLint with strict TypeScript rules (port from synapse-cli config)
- [ ] Create directory structure per architecture (src/commands, src/core, src/services, src/adapters, src/utils)
- [ ] Port `agents/*.yaml` (39 files) from cognit fork
- [ ] Port `config/cognitive-types.yaml` from cognit fork
- [ ] Port and adapt `scripts/compile.ts` from cognit fork
- [ ] Verify compile pipeline: YAML -> TypeScript generated files
- [ ] Set up `src/core/types.ts` with core interfaces
- [ ] Port logger from synapse-cli (`src/utils/logger.ts`)
- [ ] Write first test: compile script produces valid TypeScript
- [ ] `npm run build` produces a working (empty) CLI binary

**Exit Criteria:** `cognit --help` prints a help message. Build pipeline works end-to-end. Generated types compile without errors.

### M1: Core CLI with Basic Skill Loading (3-5 days)

**Deliverables:**
- [ ] `src/cli.ts` -- command routing (add, list, remove, init, help, version)
- [ ] `src/services/registry/detection.ts` -- detect installed agents on filesystem
- [ ] `src/services/discovery/scanner.ts` -- scan directories for SKILL.md/AGENT.md/PROMPT.md
- [ ] `src/services/discovery/parser.ts` -- parse frontmatter with gray-matter
- [ ] `src/services/resolver/source-parser.ts` -- parse GitHub owner/repo, local paths, URLs
- [ ] `src/adapters/git.ts` -- shallow clone via simple-git
- [ ] `src/services/installer/file-ops.ts` -- symlink/copy with fallback
- [ ] `src/services/installer/paths.ts` -- path sanitization, canonical paths
- [ ] `src/services/installer/orchestrator.ts` -- install flow coordination
- [ ] `src/services/lock/lock-file.ts` -- .cognit-lock.json CRUD
- [ ] `cognit add owner/repo` works end-to-end (clone -> discover -> detect agents -> install -> lock)
- [ ] `cognit add ./local/path` works for local directories
- [ ] `cognit list` shows installed cognitives from lock file
- [ ] `cognit remove <name>` removes cognitive + updates lock file
- [ ] Unit tests for: source parser, scanner, parser, file-ops, paths, lock file
- [ ] Integration test: full add -> list -> remove cycle

**Exit Criteria:** A user can install a cognitive from GitHub, see it listed, and remove it. Lock file accurately reflects state.

### M2: Polish and Secondary Commands (2-3 days)

**Deliverables:**
- [ ] `cognit init` -- scaffold SKILL.md / AGENT.md / PROMPT.md with interactive prompts
- [ ] `cognit check` -- compare lock file hashes against GitHub tree SHA
- [ ] `cognit update` -- re-install outdated cognitives (call add internally, not npx)
- [ ] `src/adapters/github.ts` -- GitHub API for tree SHA lookups
- [ ] Interactive agent selection when multiple agents detected (using @clack/prompts)
- [ ] Interactive cognitive selection when repo contains multiple cognitives
- [ ] `--yes` flag for non-interactive mode
- [ ] `--global` flag for global installation scope
- [ ] `--list` flag on add to preview without installing
- [ ] Help text for every command
- [ ] Unit tests for: init scaffolding, check logic, update logic

**Exit Criteria:** All 7 core commands work. Non-interactive mode supports CI/CD usage.

### M3: DX Features and Diagnostics (2-3 days)

**Deliverables:**
- [ ] `cognit doctor` -- diagnostic checks (ported from synapse-cli pattern):
  - Lock file exists and is valid JSON
  - All lock file entries have corresponding files on disk
  - All symlinks are valid (not broken)
  - At least one agent is detected
  - Agent directories exist and are writable
  - No orphaned cognitive files (on disk but not in lock)
  - Cognitive frontmatter is valid
  - Version check (is cognit up to date)
- [ ] `src/services/agents-md/generator.ts` -- AGENTS.md marker-based generation (ported from synapse-cli)
- [ ] Auto-generate AGENTS.md on install/remove (opt-in via flag)
- [ ] Error handling: custom error classes with helpful messages
- [ ] Graceful Ctrl+C handling during prompts
- [ ] Unit tests for: doctor checks, AGENTS.md generator

**Exit Criteria:** `cognit doctor` passes on a healthy installation. AGENTS.md is generated with correct content.

### M4: Testing, Documentation, Release Prep (2-3 days)

**Deliverables:**
- [ ] Achieve >= 70% line coverage, >= 60% branch coverage
- [ ] Add missing tests for edge cases (broken symlinks, corrupted lock file, missing agents)
- [ ] README.md with: installation, quick start, command reference, cognitive types explanation
- [ ] CONTRIBUTING.md with: setup, testing, adding agents, architecture overview
- [ ] LICENSE (MIT)
- [ ] CI pipeline: lint + typecheck + test on push
- [ ] `npm publish` dry run -- verify package contents
- [ ] Manual QA: test on macOS with Claude Code, Cursor, and at least one other agent
- [ ] CHANGELOG.md with v0.1.0 release notes

**Exit Criteria:** Package is publishable to npm. README covers all commands. Tests pass in CI.

---

## 3. Risks and Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| **Upstream adds agents faster than we can port** | Medium | High | Agent additions are just YAML files (~5 min each). Monthly batch port. Not blocking. |
| **SKILL.md format diverges upstream** | High | Low | Format is simple and stable (name, description, metadata). Monitor upstream releases. |
| **Symlink handling fails on some OS/filesystem** | Medium | Medium | Copy fallback is built in. Test on macOS + Linux. Windows deferred to v0.2. |
| **gray-matter or simple-git have breaking changes** | Low | Low | Pin versions. Both are mature, stable libraries. |
| **Solo developer bandwidth** | High | High | MVP is scoped to ~10-14 days of work. Milestones are small and shippable independently. M0+M1 alone provide core value. |
| **Scope creep during development** | Medium | Medium | This plan is the scope contract. Features not listed are not in v0.1. Period. |
| **Lock file format design proves inadequate** | Medium | Low | Start with minimal schema. Lock file is internal -- format can change in v0.x without breaking promises. |
| **Agent directory paths are wrong for some agents** | Medium | Medium | Port YAML from cognit fork (which has been validated). Test with top 5 agents manually. |

---

## 4. Dependencies and Prerequisites

### 4.1 Must Have Before Starting

- [ ] Node.js >= 20 installed
- [ ] Access to cognit repo (for porting YAML agents and compile script)
- [ ] Access to synapse-cli repo (for porting logger, doctor patterns, test patterns)
- [ ] npm account for publishing (can be set up during M4)
- [ ] GitHub repo for cognit-cli created

### 4.2 Runtime Dependencies (5 total)

| Package | Purpose | Version |
|---------|---------|---------|
| `@clack/prompts` | Interactive terminal prompts | ^0.11.0 |
| `gray-matter` | YAML frontmatter parsing | ^4.0.3 |
| `simple-git` | Git clone operations | ^3.27.0 |
| `picocolors` | Terminal colors | ^1.1.0 |
| `ora` | Terminal spinners | ^9.0.0 |

### 4.3 Dev Dependencies

| Package | Purpose |
|---------|---------|
| `tsup` | Build/bundle |
| `typescript` | Type checking |
| `vitest` | Testing |
| `@vitest/coverage-v8` | Coverage |
| `tsx` | Script execution (compile step) |
| `yaml` | YAML parsing (build scripts only) |
| `eslint` + `@typescript-eslint/*` | Linting |
| `prettier` | Formatting |

---

## 5. Concrete Next Steps

### Immediate (Today)

1. **Create the `cognit-cli` repository** (or repurpose the existing one at the current working directory)
2. **Initialize project**: `npm init`, install deps, set up tsconfig/tsup/vitest/eslint
3. **Copy YAML agent files** from cognit fork (39 files + cognitive-types.yaml)
4. **Port compile script** from cognit fork and verify it generates valid TypeScript
5. **Port logger** from synapse-cli

### This Week

6. **Implement M0** (scaffolding, build pipeline, generated types)
7. **Start M1** (source parser, scanner, git adapter, installer)
8. **Get `cognit add` working** end-to-end with a real GitHub repo

### Next Week

9. **Complete M1** (list, remove, lock file, tests)
10. **Implement M2** (init, check, update, interactive prompts)
11. **Start M3** (doctor, AGENTS.md generator)

### Week After

12. **Complete M3** (DX polish, error handling)
13. **Implement M4** (testing, documentation, CI, release prep)
14. **First npm publish**: `cognit@0.1.0`

---

## 6. Post-MVP Roadmap (v0.2+)

| Version | Features |
|---------|----------|
| v0.2 | Windows support, `cognit find` (GitHub search), remote providers (Mintlify, HuggingFace) |
| v0.3 | Project config file, sync engine (4-phase), watch mode |
| v0.4 | Execution engine (run cognitives via provider APIs) |
| v0.5 | Publishing system, self-hosted registry |
| v1.0 | Stable API, full provider coverage, community adoption |

---

*MVP plan by Agent D -- Strategy Architect*
*Based on Strategy Decision Matrix (04) and Proposed Architecture (05)*
