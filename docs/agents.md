# Agent System

Comprehensive documentation for the `@synapsync/agent-sync-sdk` agent system.

## Overview

The SDK supports 39 AI coding agents. Each agent has a specific directory structure for storing cognitives. The SDK installs cognitives to a canonical location (`.agents/cognit/`) and creates symlinks into each agent's directory.

Agents are split into two categories:
- **10 universal agents** that share the `.agents` local root directory.
- **29 non-universal agents** that each have their own agent-specific local root directory.

## Supported Agents

### Universal Agents

Universal agents use `.agents` as their local root. Cognitives placed in `.agents/skills/`, `.agents/agents/`, etc. are accessible to all universal agents simultaneously.

| Agent ID | Display Name | Local Root | Global Root | Detection |
|----------|-------------|------------|-------------|-----------|
| `adal` | Adal | `.agents` | `~/.adal` | homeDir: `.adal` |
| `amp` | Amp | `.agents` | `~/.amp` | homeDir: `.amp` |
| `augment` | Augment | `.agents` | `~/.augment` | homeDir: `.augment` |
| `codex` | Codex | `.agents` | `~/.codex` | homeDir: `.codex` |
| `gemini-cli` | Gemini CLI | `.agents` | `~/.gemini` | homeDir: `.gemini` |
| `goose` | Goose | `.agents` | `~/.goose` | homeDir: `.goose` |
| `junie` | Junie | `.agents` | `~/.junie` | homeDir: `.junie` |
| `kiro-cli` | Kiro CLI | `.agents` | `~/.kiro` | homeDir: `.kiro` |
| `opencode` | OpenCode | `.agents` | `~/.opencode` | homeDir: `.opencode` |
| `trae` | Trae | `.agents` | `~/.trae` | homeDir: `.trae` |

### Non-Universal Agents

Non-universal agents use agent-specific directories. Cognitives are symlinked into these directories from the canonical location.

| Agent ID | Display Name | Local Root | Global Root | Detection |
|----------|-------------|------------|-------------|-----------|
| `aider` | Aider | `.aider` | `~/.aider` | cwdDir: `.aider` |
| `bolt` | Bolt | `.bolt` | `~/.bolt` | cwdDir: `.bolt` |
| `claude-code` | Claude Code | `.claude` | `~/.claude` | cwdDir: `.claude` |
| `cline` | Cline | `.cline` | `~/.cline` | cwdDir: `.cline` |
| `cody` | Cody | `.cody` | `~/.cody` | cwdDir: `.cody` |
| `continue` | Continue | `.continue` | `~/.continue` | cwdDir: `.continue` |
| `crush` | Crush | `.crush` | `~/.crush` | cwdDir: `.crush` |
| `cursor` | Cursor | `.cursor` | `~/.cursor` | cwdDir: `.cursor` |
| `devin` | Devin | `.devin` | `~/.devin` | cwdDir: `.devin` |
| `double` | Double | `.double` | `~/.double` | cwdDir: `.double` |
| `duo` | Duo | `.duo` | `~/.duo` | cwdDir: `.duo` |
| `github-copilot` | GitHub Copilot | `.github` | `~/.github` | cwdDir: `.github` |
| `grit` | Grit | `.grit` | `~/.grit` | cwdDir: `.grit` |
| `kode` | Kode | `.kode` | `~/.kode` | cwdDir: `.kode` |
| `lovable` | Lovable | `.lovable` | `~/.lovable` | cwdDir: `.lovable` |
| `mcpjam` | MCPJam | `.mcpjam` | `~/.mcpjam` | cwdDir: `.mcpjam` |
| `mentat` | Mentat | `.mentat` | `~/.mentat` | cwdDir: `.mentat` |
| `pochi` | Pochi | `.pochi` | `~/.pochi` | cwdDir: `.pochi` |
| `qoder` | Qoder | `.qoder` | `~/.qoder` | cwdDir: `.qoder` |
| `replit` | Replit | `.replit` | `~/.replit` | cwdDir: `.replit` |
| `roo` | Roo | `.roo` | `~/.roo` | cwdDir: `.roo` |
| `sourcegraph` | Sourcegraph | `.sourcegraph` | `~/.sourcegraph` | cwdDir: `.sourcegraph` |
| `supermaven` | Supermaven | `.supermaven` | `~/.supermaven` | cwdDir: `.supermaven` |
| `sweep` | Sweep | `.sweep` | `~/.sweep` | cwdDir: `.sweep` |
| `tabnine` | Tabnine | `.tabnine` | `~/.tabnine` | cwdDir: `.tabnine` |
| `void` | Void | `.void` | `~/.void` | cwdDir: `.void` |
| `windsurf` | Windsurf | `.windsurf` | `~/.windsurf` | cwdDir: `.windsurf` |
| `zed` | Zed | `.zed` | `~/.zed` | cwdDir: `.zed` |
| `zencoder` | ZenCoder | `.zencoder` | `~/.zencoder` | cwdDir: `.zencoder` |

## Universal vs Non-Universal Agents

- **Universal agents** use `.agents` as their local root. Multiple agents share the same directory. Cognitives placed in `.agents/skills/`, `.agents/agents/`, etc. are accessible to all universal agents at once.
- **Non-universal agents** use agent-specific directories (e.g., `.cursor`, `.claude`). Cognitives are symlinked into these directories from the canonical location at `.agents/cognit/`.

This distinction matters during installation. When you run `sdk.add(source, { agents: ["cursor", "goose"] })`:
- **Cursor** (non-universal): A symlink is created from `.cursor/{type}/{name}/` pointing to the canonical path.
- **Goose** (universal): The cognitive is already accessible at `.agents/{type}/` -- no additional symlink needed.

## Agent Detection System

The SDK can detect which agents are installed on the system:

```typescript
const detectionResults = await sdk.agents.detectInstalled();
for (const result of detectionResults) {
  console.log(`${result.displayName}: ${result.installed ? 'installed' : 'not found'}`);
}
```

### Detection Methods

| Method | Description | Example |
|--------|-------------|---------|
| `cwdDir` | Check if directory exists in current working directory. | `.cursor/` |
| `homeDir` | Check if directory exists in home directory. | `~/.goose/` |
| `envVar` | Check if an environment variable exists. | -- |
| `absolutePath` | Check if an absolute path exists. | -- |

The 10 universal agents use `homeDir` detection. The 29 non-universal agents use `cwdDir` detection.

## AgentRegistry Interface

```typescript
interface AgentRegistry {
  getAll(): ReadonlyMap<AgentType, AgentConfig>;
  get(type: AgentType): AgentConfig | undefined;
  getUniversalAgents(cognitiveType?: CognitiveType): AgentType[];
  getNonUniversalAgents(cognitiveType?: CognitiveType): AgentType[];
  isUniversal(type: AgentType, cognitiveType?: CognitiveType): boolean;
  getDir(type: AgentType, cognitiveType: CognitiveType, scope: 'local' | 'global'): string | undefined;
  detectInstalled(): Promise<AgentDetectionResult[]>;
  register(config: AgentConfig): void;
}
```

### Key Methods

- **`getAll()`** -- Returns a read-only map of all 39 registered agent configs (plus any custom agents).
- **`get(type)`** -- Retrieves a single agent config by its `AgentType` identifier.
- **`getUniversalAgents(cognitiveType?)`** -- Returns agent types whose `localRoot` is `.agents`. Optionally filtered by cognitive type.
- **`getNonUniversalAgents(cognitiveType?)`** -- Returns agent types with agent-specific local roots. Optionally filtered by cognitive type.
- **`isUniversal(type, cognitiveType?)`** -- Returns `true` if the agent uses the shared `.agents` directory.
- **`getDir(type, cognitiveType, scope)`** -- Returns the resolved directory path for a given agent, cognitive type, and scope (`local` or `global`).
- **`detectInstalled()`** -- Runs detection for all registered agents and returns results.
- **`register(config)`** -- Adds a custom agent config at runtime.

## Cognitive File Format

Cognitive files use Markdown with YAML frontmatter (parsed by `gray-matter`):

```markdown
---
name: react-best-practices
description: Best practices for React development
version: "1.0.0"
tags:
  - react
  - frontend
---

# React Best Practices

Your cognitive content goes here...
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Unique identifier for the cognitive. |
| `description` | `string` | Human-readable description. |

Optional metadata fields are preserved and accessible via `cognitive.metadata`.

## Cognitive Types

| Type | File Name | Canonical Path Example |
|------|-----------|----------------------|
| `skill` | `SKILL.md` | `.agents/cognit/skills/general/my-skill/SKILL.md` |
| `agent` | `AGENT.md` | `.agents/cognit/agents/general/my-agent/AGENT.md` |
| `prompt` | `PROMPT.md` | `.agents/cognit/prompts/general/my-prompt/PROMPT.md` |
| `rule` | `RULE.md` | `.agents/cognit/rules/general/my-rule/RULE.md` |

## Directory Structure

### Canonical Layout

```
.agents/
└── cognit/
    ├── .cognit-lock.json
    ├── skills/
    │   └── {category}/
    │       └── {name}/
    │           └── SKILL.md
    ├── agents/
    │   └── {category}/
    │       └── {name}/
    │           └── AGENT.md
    ├── prompts/
    │   └── {category}/
    │       └── {name}/
    │           └── PROMPT.md
    └── rules/
        └── {category}/
            └── {name}/
                └── RULE.md
```

### Default Categories

`general`, `planning`, `qa`, `growth`, `frontend`, `backend`, `devops`, `security`, `data`, `mobile`, `infra`.

### Agent Symlink Layout

For non-universal agents, symlinks point from the agent directory into the canonical location:

```
.cursor/
└── skills/
    └── my-skill/ -> ../../.agents/cognit/skills/general/my-skill/

.claude/
└── rules/
    └── my-rule/ -> ../../.agents/cognit/rules/general/my-rule/
```

## Custom Agent Registration

### At SDK Creation Time

Register custom agents when creating the SDK instance:

```typescript
import { createAgentSyncSDK, type AgentConfig, agentName } from '@synapsync/agent-sync-sdk';

const myAgent: AgentConfig = {
  name: agentName('my-agent'),
  displayName: 'My Custom Agent',
  dirs: {
    skill: { local: '.my-agent/skills', global: '~/.my-agent/skills' },
    agent: { local: '.my-agent/agents', global: '~/.my-agent/agents' },
    prompt: { local: '.my-agent/prompts', global: '~/.my-agent/prompts' },
    rule: { local: '.my-agent/rules', global: '~/.my-agent/rules' },
  },
  detectInstalled: async () => {
    // Return true if your agent is installed
    return false;
  },
  showInUniversalList: false,
};

const sdk = createAgentSyncSDK({
  agents: { additional: [myAgent] },
});
```

### At Runtime

Register agents after SDK initialization:

```typescript
sdk.agents.register(myAgent);
```

### AgentConfig Shape

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `AgentType` | Yes | Unique agent identifier (use `agentName()` helper). |
| `displayName` | `string` | Yes | Human-readable display name. |
| `dirs` | `Record<CognitiveType, { local: string; global: string }>` | Yes | Directory paths for each cognitive type. |
| `detectInstalled` | `() => Promise<boolean>` | Yes | Function to detect if the agent is installed. |
| `showInUniversalList` | `boolean` | No | Whether this agent appears in universal agent lists. Defaults to `false`. |

## See Also

- [Architecture](./architecture.md)
- [Type System](./type-system.md)
- [Getting Started](./getting-started.md)
