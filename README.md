# @synapsync/agent-sync-sdk

[![npm version](https://img.shields.io/npm/v/@synapsync/agent-sync-sdk)](https://www.npmjs.com/package/@synapsync/agent-sync-sdk)
[![CI](https://img.shields.io/github/actions/workflow/status/SynapSync/agent-sync-sdk/ci.yml?branch=main)](https://github.com/SynapSync/agent-sync-sdk/actions)
[![License](https://img.shields.io/npm/l/@synapsync/agent-sync-sdk)](./LICENSE)
[![Node](https://img.shields.io/node/v/@synapsync/agent-sync-sdk)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%2B-blue)](https://www.typescriptlang.org)

> A TypeScript SDK for installing, managing, and synchronizing cognitive files (skills, prompts, rules) across 39 AI coding agents from a single source of truth.

## Features

- **8 SDK operations** -- `add`, `remove`, `list`, `find`, `update`, `sync`, `check`, and `init`
- **39 AI agent targets** -- Claude Code, Cursor, Windsurf, GitHub Copilot, and 35 more
- **4 cognitive types** -- skills, prompts, rules, and agent definitions, each stored as Markdown with YAML frontmatter
- **Type-safe `Result<T, E>` pattern** -- no thrown exceptions; every operation returns `Ok` or `Err`
- **Event-driven architecture** -- 26+ events for logging, progress tracking, and UI integration
- **Lock file system** -- reproducible installations via `.cognit-lock.json`
- **Zero runtime dependencies** beyond `gray-matter` and `simple-git`

## Installation

```bash
# npm
npm install @synapsync/agent-sync-sdk

# pnpm
pnpm add @synapsync/agent-sync-sdk

# yarn
yarn add @synapsync/agent-sync-sdk
```

**Requirements:** Node.js >= 20, ESM-only.

## Quick Start

```typescript
import { createAgentSyncSDK, isOk } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK();

// Add cognitives from a GitHub repository
const result = await sdk.add('owner/repo', {
  agents: ['claude-code', 'cursor'],
  confirmed: true,
});

if (isOk(result)) {
  console.log(result.value.message);
  console.log(`Installed: ${result.value.installed.length} cognitives`);
}

// List installed cognitives
const list = await sdk.list();
if (isOk(list)) {
  for (const c of list.value.cognitives) {
    console.log(`${c.name} (${c.cognitiveType}) from ${c.source}`);
  }
}

// Clean up
await sdk.dispose();
```

See the [Getting Started guide](docs/getting-started.md) for configuration options and more examples.

## Supported Agents

The SDK ships with 39 built-in agent definitions organized into two categories.

### Universal Agents

These agents share the `.agents` local root directory.

| Agent ID | Display Name |
|----------|-------------|
| `adal` | Adal |
| `amp` | Amp |
| `augment` | Augment |
| `codex` | Codex |
| `gemini-cli` | Gemini CLI |
| `goose` | Goose |
| `junie` | Junie |
| `kiro-cli` | Kiro CLI |
| `opencode` | OpenCode |
| `trae` | Trae |

### Agent-Specific Agents

Each of these agents has its own dedicated root directory.

| Agent ID | Display Name | Root Dir |
|----------|-------------|----------|
| `aider` | Aider | `.aider` |
| `bolt` | Bolt | `.bolt` |
| `claude-code` | Claude Code | `.claude` |
| `cline` | Cline | `.cline` |
| `cody` | Cody | `.cody` |
| `continue` | Continue | `.continue` |
| `crush` | Crush | `.crush` |
| `cursor` | Cursor | `.cursor` |
| `devin` | Devin | `.devin` |
| `double` | Double | `.double` |
| `duo` | Duo | `.duo` |
| `github-copilot` | GitHub Copilot | `.github` |
| `grit` | Grit | `.grit` |
| `kode` | Kode | `.kode` |
| `lovable` | Lovable | `.lovable` |
| `mcpjam` | MCPJam | `.mcpjam` |
| `mentat` | Mentat | `.mentat` |
| `pochi` | Pochi | `.pochi` |
| `qoder` | Qoder | `.qoder` |
| `replit` | Replit | `.replit` |
| `roo` | Roo | `.roo` |
| `sourcegraph` | Sourcegraph | `.sourcegraph` |
| `supermaven` | Supermaven | `.supermaven` |
| `sweep` | Sweep | `.sweep` |
| `tabnine` | Tabnine | `.tabnine` |
| `void` | Void | `.void` |
| `windsurf` | Windsurf | `.windsurf` |
| `zed` | Zed | `.zed` |
| `zencoder` | ZenCoder | `.zencoder` |

## Cognitive Types

Cognitives are Markdown files with YAML frontmatter, organized by type into subdirectories.

| Type | Directory | File | Purpose |
|------|-----------|------|---------|
| `skill` | `skills/` | `SKILL.md` | Reusable capabilities and techniques |
| `agent` | `agents/` | `AGENT.md` | Agent behavior definitions |
| `prompt` | `prompts/` | `PROMPT.md` | Prompt templates |
| `rule` | `rules/` | `RULE.md` | Rules and constraints |

## API Reference

The SDK exposes a single factory function and a set of result helpers:

| Export | Description |
|--------|-------------|
| `createAgentSyncSDK(config?)` | Creates an SDK instance with optional configuration |
| `isOk(result)` / `isErr(result)` | Type guards for the `Result<T, E>` pattern |
| `ok(value)` / `err(error)` | Constructors for `Result` values |
| `unwrap(result)` | Extracts the value or throws |
| `mapResult(result, fn)` | Maps over the `Ok` value |

For full method signatures, options, and return types, see:

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, configuration, and first operations |
| [API Reference](docs/api-reference.md) | Complete SDK method signatures and examples |
| [Type System](docs/type-system.md) | `Result<T, E>`, branded types, and type guards |
| [Providers](docs/providers.md) | Source providers: GitHub, Local, and more |
| [Events](docs/events.md) | Event bus, 26+ event types, and subscription patterns |
| [Errors](docs/errors.md) | Error taxonomy and error codes |
| [Architecture](docs/architecture.md) | Internal design and data flow |
| [Agents](docs/agents.md) | Agent registry and definitions |

## Contributing

We welcome contributions. A formal `CONTRIBUTING.md` guide is coming in a future release. In the meantime:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Install dependencies (`pnpm install`)
4. Run tests (`pnpm test`)
5. Submit a pull request

## License

[MIT](./LICENSE)
