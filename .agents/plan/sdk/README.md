# Agent Sync SDK — Sprint Plan

## Project Overview

**Package:** `@synapsync/agent-sync-sdk`
**Type:** Single npm package (no monorepo, no CLI)
**Runtime:** Node 20+, TypeScript strict, ESM-only
**Scope:** Interface-agnostic SDK for managing cognitive resources (skills, prompts, rules, agents) across 39+ AI coding agents

## Key Decisions

| Decision          | Choice                                | Rationale                                                       |
| ----------------- | ------------------------------------- | --------------------------------------------------------------- |
| Package structure | Single package                        | No over-engineering; CLI can be added as separate package later |
| Module system     | ESM-only                              | Modern standard, tree-shakeable                                 |
| Error handling    | `Result<T, E>` discriminated unions   | No exceptions for control flow                                  |
| Type safety       | Branded types                         | Prevent accidental string mixing                                |
| DI pattern        | Composition root via factory function | No singletons, no global state                                  |
| Observability     | Typed EventBus                        | Not console.log                                                 |
| Testing           | Vitest + in-memory FS adapter         | Fast, deterministic tests                                       |
| Agent definitions | YAML compiled to TypeScript           | Source of truth in YAML, type-safe at runtime                   |

## Sprint Summary

| Sprint | Name                            | Duration | Focus                                                                  |
| ------ | ------------------------------- | -------- | ---------------------------------------------------------------------- |
| 1      | Foundation                      | 5 days   | Project setup, type system, error hierarchy                            |
| 2      | Core Systems                    | 5 days   | Config, events, filesystem adapter, agent system                       |
| 3      | Discovery & Sources             | 5 days   | Scanner, parser, source resolution, git client                         |
| 4      | Providers                       | 5 days   | Provider interface, GitHub, Local, caching                             |
| 5      | Installation & Persistence      | 7 days   | Installer, lock system, atomic operations                              |
| 6      | Operations                      | 7 days   | 8 core operations (add, list, remove, update, sync, check, init, find) |
| 7      | Public API & Extended Providers | 5 days   | Composition root, exports, additional providers                        |
| 8      | Quality & Hardening             | 7 days   | Unit/integration/E2E tests, 85% coverage, CI                           |

**Total estimated:** ~46 days

## Architecture Reference

Detailed design documents in: `../.agents/plan/cognit-sdk-core/plan/`

## Document Index

- [ANALYSIS.md](./analysis/ANALYSIS.md) — Technical analysis and scope definition
- [PLANNING.md](./planning/PLANNING.md) — Implementation strategy and phase dependencies
- [EXECUTION.md](./execution/EXECUTION.md) — Detailed task breakdown by phase
- [PROGRESS.md](./sprints/PROGRESS.md) — Master progress dashboard
- Sprint plans:
  - [Sprint 1: Foundation](./sprints/SPRINT-1-foundation.md)
  - [Sprint 2: Core Systems](./sprints/SPRINT-2-core-systems.md)
  - [Sprint 3: Discovery & Sources](./sprints/SPRINT-3-discovery-sources.md)
  - [Sprint 4: Providers](./sprints/SPRINT-4-providers.md)
  - [Sprint 5: Installation & Persistence](./sprints/SPRINT-5-installation-persistence.md)
  - [Sprint 6: Operations](./sprints/SPRINT-6-operations.md)
  - [Sprint 7: Public API & Extended Providers](./sprints/SPRINT-7-public-api.md)
  - [Sprint 8: Quality & Hardening](./sprints/SPRINT-8-quality.md)
