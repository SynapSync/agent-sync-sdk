# Executive Summary: cognit-cli Strategy

> **Date**: 2026-02-09
> **Decision**: Fork vs SDK vs Hybrid for cognit-cli
> **Recommendation**: Hybrid Architecture (Own Core + Selective Adaptation)

---

## Problem Statement

Three codebases exist with overlapping goals -- managing AI agent instructions (skills, agents, prompts) across 39+ coding agents:

1. **vercel-labs/skills** -- the fast-growing upstream (~5K stars in <1 month) that defines the ecosystem standard (SKILL.md format, `skills` CLI)
2. **cognit** -- a fork of upstream with original innovations (YAML agent configs, cognitive type system, modular architecture)
3. **synapse-cli** -- the user's independent prior project with 515 tests, 80% coverage, and proven patterns (sync engine, doctor diagnostics, AGENTS.md generation)

The question: should the user maintain `cognit` as a permanent fork of `vercel-labs/skills`, consume upstream as an npm dependency/SDK, or build a new project that takes the best from all three?

---

## Key Findings

### Upstream (vercel-labs/skills)

- **No programmatic API** -- only a CLI binary, no exports, no types. Cannot be consumed as a dependency.
- Extremely active: 30 commits/week, daily releases, no semver discipline. Lock file format already broke once (v2 to v3).
- Valuable data: 38 agent definitions, SKILL.md format standard, provider patterns (Mintlify, HuggingFace, well-known).

### Cognit (Fork)

- Two standout innovations: **YAML-based agent config** (adding an agent = adding a 3-line YAML file) and **cognitive type generalization** (skill/agent/prompt).
- Still deeply coupled to Vercel infrastructure: telemetry to `add-skill.vercel.sh`, search via `skills.sh`, promotional prompt for `vercel-labs/skills`.
- Accumulated tech debt: ~20 deprecated aliases, provider/source duplication, 1,244-line `add.ts`, `npx`-based update command.

### Synapse-CLI (Original)

- Production-quality engineering: 515 tests, 80% coverage, maximum TypeScript strictness, 5 runtime dependencies.
- Proven reusable components: logger, 4-phase sync engine, doctor diagnostics, AGENTS.md marker-based generator.
- Strategic lesson: starting with too many cognitive types (5) and a custom registry was premature complexity.

---

## Recommended Strategy: Hybrid Architecture

**Build a new `cognit-cli` project from scratch, combining the best components from all three codebases, with no code dependency on upstream.**

The SDK strategy is not viable because upstream exposes no API. The fork strategy is unsustainable because a solo developer cannot keep pace with 30 commits/week of merge conflicts. The hybrid strategy offers complete architectural freedom, maximum sustainability, and the ability to cherry-pick the best ideas without inheriting tech debt.

The only real value from upstream is **data** (39 agent definitions, SKILL.md format, provider URL patterns), not code. Data can be ported as YAML files. Code coupling is eliminated entirely.

---

## Target Architecture

A layered architecture with clear separation of concerns (detailed in Report 05):

- **Core Layer**: Type system, config management, cognitive engine -- fully owned
- **Service Layer**: Agent registry (YAML-driven), discovery, installer, resolver, lock, sync -- fully owned
- **Adapter Layer**: Git, GitHub, and provider adapters -- the only place external systems are touched
- **Build-Time Layer**: YAML agent configs compiled to TypeScript at build time (ported from cognit fork)
- **DX Layer**: Logger, doctor diagnostics, AGENTS.md generator (ported from synapse-cli)

Single npm package. No monorepo. 5 runtime dependencies. Node >= 20. ESM.

---

## MVP Plan Overview

Four milestones targeting a publishable v0.1:

| Milestone | Focus               | Scope                                           |
| --------- | ------------------- | ----------------------------------------------- |
| **M0**    | Project scaffolding | Build pipeline, YAML compile, types, logger     |
| **M1**    | Core CLI            | `add`, `list`, `remove` + installer + lock file |
| **M2**    | Secondary commands  | `init`, `check`, `update` + interactive prompts |
| **M3**    | DX features         | `doctor`, AGENTS.md, error handling             |
| **M4**    | Release prep        | Tests (>= 70% coverage), docs, CI, npm publish  |

Post-MVP: Windows support (v0.2), providers (v0.2), sync engine (v0.3), execution engine (v0.4).

---

## Top 3 Risks

| Risk                                         | Impact                                       | Mitigation                                                                                                            |
| -------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Upstream adds agents faster than we port** | Medium -- could fall behind on agent support | Agent additions are YAML data files (~5 min each). Monthly batch port. The YAML system makes this trivial.            |
| **Solo developer bandwidth**                 | High -- MVP could stall                      | Milestones are small and independently shippable. M0+M1 alone provide core value. Scope is deliberately minimal.      |
| **SKILL.md format diverges upstream**        | High -- ecosystem incompatibility            | Format is simple and stable (name, description, metadata fields). Unlikely to change significantly. Monitor releases. |

---

## Call to Action

1. **Accept the Hybrid Architecture strategy** -- no more fork maintenance, no SDK that doesn't exist
2. **Start M0 immediately** -- scaffold the project, port YAML agents and compile pipeline
3. **Ship M1 within the first week** -- a working `cognit add` is the proof of concept
4. **Publish v0.1 to npm within 2-3 weeks** -- claim the package name, establish the project identity

The fork served its purpose as an exploration. The synapse-cli proved the engineering patterns. Now it's time to build the real thing -- clean, owned, and sustainable.

---

### Report Index

| #   | Title                                                        | Contents                                   |
| --- | ------------------------------------------------------------ | ------------------------------------------ |
| 00  | Executive Summary                                            | This document                              |
| 01  | [Vercel Skills Analysis](./01-vercel-skills-analysis.md)     | Upstream repo deep dive                    |
| 02  | [Cognit Analysis](./02-cognit-analysis.md)                   | Fork evolution, innovations, tech debt     |
| 03  | [Synapse-CLI Analysis](./03-synapse-cli-analysis.md)         | Original project, reusable components      |
| 04  | [Strategy Decision Matrix](./04-strategy-decision-matrix.md) | Three strategies evaluated with scoring    |
| 05  | [Proposed Architecture](./05-proposed-architecture.md)       | Layer diagrams, interfaces, file structure |
| 06  | [MVP Plan](./06-mvp-plan.md)                                 | Milestones, scope, risks, next steps       |

---

_Executive summary by Agent D -- Strategy Architect_
_Synthesized from Reports 01, 02, 03_
