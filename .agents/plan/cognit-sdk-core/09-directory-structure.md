# 09 -- Directory Structure

## 1. Overview

This document defines three directory structures:

1. **SDK Source Code** -- how the `cognit-core` and `cognit-cli` packages are organized as a monorepo
2. **Runtime Directories** -- what the SDK creates on the user's filesystem when cognitives are installed
3. **Cognitive File Schemas** -- the frontmatter format for each cognitive type

---

## 2. Monorepo Structure

The project is structured as a monorepo with two packages under `packages/`:

```
cognit-cli/                          # Repository root
  package.json                       # Root workspace config
  tsconfig.json                      # Root TypeScript config (references)
  pnpm-workspace.yaml                # Workspace definition
  .gitignore
  LICENSE
  README.md

  packages/
    cognit-core/                     # SDK core library
      package.json                   # @synapsync/cognit-core
      tsconfig.json
      tsup.config.ts
      vitest.config.ts

      agents/                        # Agent YAML definitions (39+ files)
        claude-code.yaml
        cursor.yaml
        codex.yaml
        opencode.yaml
        windsurf.yaml
        copilot-chat.yaml
        ...

      config/                        # Build-time configuration
        cognitive-types.yaml          # CognitiveType definitions
        categories.yaml              # Default category definitions

      scripts/                       # Build-time code generators
        compile-agents.ts            # YAML -> TypeScript agent registry
        validate-agents.ts           # Agent YAML validation

      src/
        index.ts                     # Public API barrel export

        types/                       # Core type definitions
          cognitive.ts               # Cognitive, CognitiveType, CognitiveFile
          agent.ts                   # AgentConfig, AgentType
          provider.ts                # HostProvider, RemoteCognitive
          installer.ts               # InstallOptions, InstallResult
          lock.ts                    # CognitLockFile, CognitLockEntry
          category.ts                # Category, CategoryConfig
          operations.ts              # AddOptions, RemoveOptions, SyncOptions
          events.ts                  # SDK event types
          errors.ts                  # Error code enums
          config.ts                  # CognitConfig
          index.ts                   # Re-exports

        agents/                      # Agent registry module
          registry.ts                # Agent lookup, detection
          detection.ts               # detectInstalledAgents()
          paths.ts                   # Agent path resolution
          __generated__/             # Build-time generated
            agent-type.ts            # AgentType union type
            agents.ts                # Full agent config records
          index.ts

        discovery/                   # Cognitive discovery/scanning
          scanner.ts                 # Filesystem scanning for cognitives
          parser.ts                  # Frontmatter parsing (gray-matter)
          plugin-manifest.ts         # Claude plugin manifest support
          index.ts

        providers/                   # Source providers
          registry.ts                # Provider registry (singleton)
          github.ts                  # GitHub provider
          mintlify.ts                # Mintlify docs provider
          huggingface.ts             # HuggingFace Spaces provider
          wellknown.ts               # RFC 8615 well-known provider
          direct.ts                  # Direct URL provider
          local.ts                   # Local filesystem provider
          types.ts                   # HostProvider interface
          index.ts

        installer/                   # Installation engine
          installer.ts               # Main Installer class
          file-ops.ts                # copyDirectory, createSymlink
          paths.ts                   # sanitizeName, isPathSafe, canonical paths
          rollback.ts                # Action tracking and rollback
          index.ts

        lock/                        # Lock file management
          manager.ts                 # LockFileManager class
          migration.ts               # Version migration functions
          integrity.ts               # Hash computation, verification
          index.ts

        operations/                  # SDK operations (the public API)
          add.ts                     # AddOperation
          remove.ts                  # RemoveOperation
          list.ts                    # ListOperation
          update.ts                  # UpdateOperation
          sync.ts                    # SyncOperation
          check.ts                   # CheckOperation (update detection)
          init.ts                    # InitOperation (scaffold new cognitive)
          doctor.ts                  # DoctorOperation (health checks)
          index.ts

        config/                      # SDK configuration
          loader.ts                  # Config file discovery and loading
          schema.ts                  # Config validation
          defaults.ts                # Default configuration values
          index.ts

        categories/                  # Category system
          registry.ts                # Category lookup and validation
          defaults.ts                # Default category definitions
          __generated__/             # Build-time generated
            categories.ts            # Category constants
          index.ts

        events/                      # Event system
          emitter.ts                 # Typed event emitter
          types.ts                   # Event type definitions
          index.ts

        errors/                      # Error handling
          base.ts                    # CognitError base class
          codes.ts                   # Error code constants
          index.ts

        source/                      # Source URL parsing
          parser.ts                  # parseSource() -- URL/path detection
          git.ts                     # Git clone operations
          index.ts

      tests/                         # Test files (mirrors src/)
        agents/
          registry.test.ts
          detection.test.ts
        discovery/
          scanner.test.ts
          parser.test.ts
        installer/
          installer.test.ts
          file-ops.test.ts
          paths.test.ts
        lock/
          manager.test.ts
          migration.test.ts
        operations/
          add.test.ts
          remove.test.ts
          sync.test.ts
        providers/
          github.test.ts
          wellknown.test.ts
        categories/
          registry.test.ts
        source/
          parser.test.ts

    cognit-cli/                      # CLI package (thin wrapper)
      package.json                   # @synapsync/cognit-cli (or just 'cognit')
      tsconfig.json
      tsup.config.ts
      bin/
        cli.js                       # Shebang entry: #!/usr/bin/env node

      src/
        index.ts                     # Entry point, command routing
        commands/                    # CLI commands (thin wrappers over SDK operations)
          add.ts
          remove.ts
          list.ts
          update.ts
          sync.ts
          check.ts
          init.ts
          find.ts
          doctor.ts
        ui/                          # CLI-specific UI
          banner.ts
          formatters.ts
          prompts.ts                 # Interactive prompts (@clack/prompts)
          search-multiselect.ts
        utils/
          logger.ts                  # Centralized logger (picocolors + ora)
```

---

## 3. Build Output

### 3.1 cognit-core Build

```
packages/cognit-core/
  dist/
    index.mjs                # ESM bundle (primary)
    index.d.mts              # TypeScript declarations
```

Published as `@synapsync/cognit-core` on npm:

```json
{
  "name": "@synapsync/cognit-core",
  "type": "module",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    }
  },
  "files": ["dist/"]
}
```

### 3.2 cognit-cli Build

```
packages/cognit-cli/
  dist/
    cli.mjs                  # Single CLI bundle
  bin/
    cli.js                   # Shebang wrapper -> ../dist/cli.mjs
```

Published as `cognit` on npm:

```json
{
  "name": "cognit",
  "type": "module",
  "bin": {
    "cognit": "./bin/cli.js"
  },
  "dependencies": {
    "@synapsync/cognit-core": "workspace:*"
  },
  "files": ["dist/", "bin/"]
}
```

### 3.3 Build Pipeline

```
agents/*.yaml + config/*.yaml
        |
        v
  scripts/compile-agents.ts
        |
        v
  src/agents/__generated__/
  src/categories/__generated__/
        |
        v
  tsup (bundle)
        |
        v
  dist/index.mjs + dist/index.d.mts
```

---

## 4. Runtime Directory Structure

### 4.1 Project-Level

When the SDK installs cognitives in a project, it creates:

```
my-project/
  .agents/
    cognit/
      .cognit-lock.json              # Lock file (project scope)

      skills/                        # Cognitive type: skills
        frontend/                    # Category
          react-19/
            SKILL.md
            assets/
          next-app-router/
            SKILL.md
        planning/
          task-decomposition/
            SKILL.md
        general/                     # Default category
          custom-skill/
            SKILL.md

      prompts/                       # Cognitive type: prompts
        backend/
          api-design/
            PROMPT.md
        general/
          code-review/
            PROMPT.md

      rules/                         # Cognitive type: rules
        security/
          owasp-top-10/
            RULE.md

      agents/                        # Cognitive type: agents
        devops/
          ci-pipeline/
            AGENT.md

  .claude/                           # Claude Code agent
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
      next-app-router/ --> ../../.agents/cognit/skills/frontend/next-app-router/
      task-decomposition/ --> ../../.agents/cognit/skills/planning/task-decomposition/
    rules/
      owasp-top-10/    --> ../../.agents/cognit/rules/security/owasp-top-10/

  .cursor/                           # Cursor agent
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
    rules/
      owasp-top-10/    --> ../../.agents/cognit/rules/security/owasp-top-10/

  .codex/                            # Codex agent
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
```

### 4.2 Global-Level

```
~/
  .agents/
    cognit/
      .cognit-lock.json              # Lock file (global scope)

      skills/
        frontend/
          react-19/
            SKILL.md
        planning/
          task-decomposition/
            SKILL.md

      prompts/
        backend/
          api-design/
            PROMPT.md

  .claude/                           # Claude Code global
    skills/
      react-19/        --> ../.agents/cognit/skills/frontend/react-19/

  .cursor/                           # Cursor global (if supported)
    skills/
      react-19/        --> ../.agents/cognit/skills/frontend/react-19/
```

### 4.3 Key Conventions

| Convention | Value |
|------------|-------|
| Central base directory | `.agents/cognit/` |
| Lock file name | `.cognit-lock.json` |
| Type subdirectories | `skills/`, `prompts/`, `rules/`, `agents/` |
| Category subdirectories | `frontend/`, `backend/`, `planning/`, `general/`, etc. |
| Cognitive file names | `SKILL.md`, `PROMPT.md`, `RULE.md`, `AGENT.md` |
| Default category | `general` |
| Symlink direction | Agent dir --> Central canonical dir |

---

## 5. Cognitive File Schemas

### 5.1 SKILL.md

```markdown
---
name: React 19 Best Practices
description: Modern React patterns using React 19 features
version: 1.2.0
category: frontend
tags:
  - react
  - typescript
  - frontend
author: SynapSync
globs:
  - "**/*.tsx"
  - "**/*.jsx"
---

# React 19 Best Practices

Instructions for the AI agent on how to write modern React 19 code...

## Server Components
...

## Actions
...
```

**Required frontmatter:**
- `name` (string) -- display name
- `description` (string) -- brief description

**Optional frontmatter:**
- `version` (string) -- semver version
- `category` (string) -- category override (defaults to directory-based)
- `tags` (string[]) -- searchable tags
- `author` (string) -- author name
- `globs` (string[]) -- file patterns this skill applies to
- `alwaysApply` (boolean) -- if true, always active

### 5.2 PROMPT.md

```markdown
---
name: API Design Prompt
description: Template for designing RESTful APIs
version: 1.0.0
category: backend
tags:
  - api
  - rest
  - design
author: SynapSync
variables:
  - name: resourceName
    description: The name of the API resource
    required: true
  - name: httpMethods
    description: HTTP methods to support
    default: "GET, POST, PUT, DELETE"
---

# API Design Prompt

Design a RESTful API for the {{resourceName}} resource...
```

**Additional frontmatter (prompt-specific):**
- `variables` (Variable[]) -- template variables with name, description, required, default

### 5.3 RULE.md

```markdown
---
name: OWASP Top 10 Rules
description: Security rules based on OWASP Top 10
version: 2.0.1
category: security
tags:
  - security
  - owasp
author: SynapSync
severity: error
alwaysApply: true
globs:
  - "**/*.ts"
  - "**/*.js"
---

# OWASP Top 10 Rules

Always follow these security rules when writing code...

## SQL Injection Prevention
...

## XSS Prevention
...
```

**Additional frontmatter (rule-specific):**
- `severity` (string) -- `error`, `warning`, `info`
- `alwaysApply` (boolean) -- if true, rule is always active

### 5.4 AGENT.md

```markdown
---
name: CI Pipeline Agent
description: Agent specialized in CI/CD pipeline configuration
version: 1.0.0
category: devops
tags:
  - ci
  - cd
  - devops
  - github-actions
author: SynapSync
capabilities:
  - pipeline-design
  - yaml-generation
  - testing-strategy
---

# CI Pipeline Agent

You are an expert CI/CD engineer...

## Behavior
...

## Constraints
...
```

**Additional frontmatter (agent-specific):**
- `capabilities` (string[]) -- what this agent persona can do

---

## 6. .gitignore

### 6.1 Root .gitignore

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Generated files
packages/cognit-core/src/agents/__generated__/
packages/cognit-core/src/categories/__generated__/

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Test
coverage/

# Environment
.env
.env.local
```

### 6.2 Project .gitignore (for users of the SDK)

The SDK generates/suggests this for projects using cognit:

```gitignore
# Cognit - DO NOT edit these directly, use `cognit add/remove`
# The lock file should be committed for reproducible installs
# Agent directories contain symlinks managed by cognit

# Keep lock file
!.agents/cognit/.cognit-lock.json

# Agent symlinks (regenerated by `cognit sync`)
# Uncomment the agents you use:
# .claude/skills/
# .cursor/skills/
# .codex/skills/
```

---

## 7. npm Publish Structure

### 7.1 cognit-core (published)

```
@synapsync/cognit-core/
  dist/
    index.mjs
    index.d.mts
  package.json
  README.md
  LICENSE
```

### 7.2 cognit-cli (published)

```
cognit/
  dist/
    cli.mjs
  bin/
    cli.js
  package.json
  README.md
  LICENSE
```

---

## 8. TypeScript Configuration

### 8.1 Root tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "references": [
    { "path": "packages/cognit-core" },
    { "path": "packages/cognit-cli" }
  ]
}
```

### 8.2 cognit-core tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 8.3 cognit-cli tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../cognit-core" }
  ]
}
```

---

## 9. Relationship to Existing Codebases

### 9.1 From cognit (fork)

| Current Location | SDK Location | Changes |
|-----------------|--------------|---------|
| `src/services/installer/` | `packages/cognit-core/src/installer/` | Add category awareness, rollback, action tracking |
| `src/services/lock/` | `packages/cognit-core/src/lock/` | Add project-scope lock, composite keys, query API |
| `src/services/discovery/` | `packages/cognit-core/src/discovery/` | No major changes |
| `src/services/registry/` | `packages/cognit-core/src/agents/` | Rename to `agents/`, keep YAML compile system |
| `src/services/source/` | `packages/cognit-core/src/source/` | No major changes |
| `src/providers/` | `packages/cognit-core/src/providers/` | Add local provider |
| `src/core/types.ts` | `packages/cognit-core/src/types/` | Split into focused files |
| `src/commands/` | `packages/cognit-cli/src/commands/` | Thin wrappers over SDK operations |
| `src/ui/` | `packages/cognit-cli/src/ui/` | CLI-specific, not in core |
| `agents/*.yaml` | `packages/cognit-core/agents/` | Same location, same format |
| `scripts/` | `packages/cognit-core/scripts/` | Same build scripts |

### 9.2 From synapse-cli

| synapse-cli Component | SDK Adoption | Notes |
|----------------------|--------------|-------|
| 4-phase sync engine | `packages/cognit-core/src/operations/sync.ts` | Adapted pattern |
| Symlink manager with fallback | `packages/cognit-core/src/installer/file-ops.ts` | Merged with cognit's approach |
| Doctor health checks | `packages/cognit-core/src/operations/doctor.ts` | Adapted pattern |
| Config walk-up discovery | `packages/cognit-core/src/config/loader.ts` | Direct port |
| AGENTS.md generator | Future operation | Not in v1 |
