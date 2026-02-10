# @synapsync/agent-sync-sdk

[![npm](https://img.shields.io/npm/v/@synapsync/agent-sync-sdk)](https://www.npmjs.com/package/@synapsync/agent-sync-sdk)
[![Node](https://img.shields.io/node/v/@synapsync/agent-sync-sdk)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/npm/l/@synapsync/agent-sync-sdk)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-458%20passed-brightgreen)]()

A TypeScript SDK that installs, manages, and synchronizes **cognitive files** (skills, agents, prompts, rules) across **39 AI coding agents** from a single source of truth.

Think of it as **"npm for AI agent instructions"** — one command to distribute knowledge to Claude Code, Cursor, Windsurf, Copilot, and 35+ other tools.

## Key Features

- **8 operations** — `add`, `remove`, `list`, `find`, `update`, `sync`, `check`, `init`
- **39 supported AI coding agents** — from Claude Code and Cursor to Windsurf, Copilot, and beyond
- **7 source providers** — GitHub, Local, Mintlify, HuggingFace, WellKnown, DirectURL, Custom
- **4 cognitive types** — `skill`, `agent`, `prompt`, `rule`
- **Type-safe `Result<T, E>` pattern** — no thrown exceptions, ever
- **Branded types** for compile-time safety on identifiers and paths
- **Event-driven architecture** with 26+ events for full observability
- **Lock file system** for reproducible installations across teams
- **Symlink-based installation** with automatic copy fallback
- **Zero runtime dependencies** beyond `gray-matter` and `simple-git`

## Quick Start

```typescript
import { createAgentSyncSDK, isOk } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK();

// Add cognitives from GitHub
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

// Remove cognitives
const removed = await sdk.remove(['my-cognitive'], { confirmed: true });

// Clean up
await sdk.dispose();
```

## Supported Agents

The SDK supports 39 AI coding agents out of the box. Each agent has a unique identifier, a display name, and a local root directory where its cognitive files are installed.

### Universal Agents

Universal agents share the `.agents` local root directory.

| Agent ID | Display Name | Local Root |
|----------|-------------|------------|
| `adal` | Adal | `.agents` |
| `amp` | Amp | `.agents` |
| `augment` | Augment | `.agents` |
| `codex` | Codex | `.agents` |
| `gemini-cli` | Gemini CLI | `.agents` |
| `goose` | Goose | `.agents` |
| `junie` | Junie | `.agents` |
| `kiro-cli` | Kiro CLI | `.agents` |
| `opencode` | OpenCode | `.agents` |
| `trae` | Trae | `.agents` |

### Agent-Specific Agents

Each of these agents has its own dedicated local root directory.

| Agent ID | Display Name | Local Root |
|----------|-------------|------------|
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

Cognitives are organized by type, each stored in its own subdirectory with a conventional file name.

| Type | Subdirectory | File Name | Description |
|------|-------------|-----------|-------------|
| `skill` | `skills/` | `SKILL.md` | Reusable capabilities and techniques |
| `agent` | `agents/` | `AGENT.md` | Agent behavior definitions |
| `prompt` | `prompts/` | `PROMPT.md` | Prompt templates |
| `rule` | `rules/` | `RULE.md` | Rules and constraints |

Each cognitive file uses Markdown with YAML frontmatter to define metadata such as name, description, version, and dependencies.

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, configuration, and first operations |
| [API Reference](docs/api-reference.md) | Complete SDK method signatures, options, and examples |
| [Type System](docs/type-system.md) | `Result<T, E>`, branded types, and type guards |
| [Providers](docs/providers.md) | Source providers: GitHub, Local, Mintlify, and more |
| [Events](docs/events.md) | Event bus, 26+ event types, and subscription patterns |
| [Errors](docs/errors.md) | Error taxonomy, `CognitError`, and error codes |
| [Architecture](docs/architecture.md) | Internal design, module boundaries, and data flow |
| [Agents](docs/agents.md) | Agent registry, definitions, and custom agents |

## Project Structure

```
agent-sync-sdk/
├── src/
│   ├── index.ts                  # Public API entry point
│   ├── sdk.ts                    # createAgentSyncSDK() factory
│   ├── types/                    # All type definitions
│   ├── errors/                   # Error hierarchy
│   ├── config/                   # Config resolution
│   ├── events/                   # EventBus implementation
│   ├── fs/                       # FileSystem adapters
│   ├── agents/
│   │   ├── definitions/          # 39 YAML agent definitions + compile script
│   │   ├── __generated__/        # Auto-generated TypeScript from YAML
│   │   └── registry.ts           # AgentRegistryImpl
│   ├── providers/                # Source providers (GitHub, Local, etc.)
│   ├── discovery/                # Scanner → Parser → Validator → Filter
│   ├── installer/                # Symlink/copy installation engine
│   ├── lock/                     # Lock file manager (v5 schema)
│   ├── operations/               # 8 operation implementations
│   └── source/                   # Source parser + Git client
├── tests/                        # 458 tests, 92% coverage
├── docs/                         # Technical documentation
├── examples/                     # Usage examples
└── dist/                         # Build output
```

## Contributing

Contributions are welcome. To get started:

1. **Fork** the repository.
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feat/my-feature
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Run tests** to make sure everything passes:
   ```bash
   pnpm test
   ```
5. **Submit a pull request** with a clear description of your changes.

Please make sure all existing tests pass and add new tests for any new functionality.

## License

[MIT](./LICENSE)
