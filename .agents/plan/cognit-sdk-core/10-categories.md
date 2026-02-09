# 10 -- Category System

## 1. Overview

Categories are organizational departments that group cognitives by domain. They provide a human-friendly way to organize, browse, and filter the growing collection of skills, prompts, rules, and agents. Categories are a first-class concept in the SDK -- they affect directory structure, lock file keys, and query operations.

Key principle: **categories exist in the central directory; agent directories flatten them**. Most AI coding agents (Claude, Cursor, Codex) have no concept of categories, so the SDK transparently maps the category hierarchy to flat agent directories.

---

## 2. What Categories Are

A category is a named organizational unit -- like a department in a company. Each cognitive belongs to exactly one category.

Examples of how categories organize cognitives:

```
.agents/cognit/skills/
  frontend/              <- category
    react-19/SKILL.md
    next-app-router/SKILL.md
    css-architecture/SKILL.md
  backend/               <- category
    api-design/SKILL.md
    database-patterns/SKILL.md
  planning/              <- category
    task-decomposition/SKILL.md
    estimation/SKILL.md
  security/              <- category
    owasp-top-10/SKILL.md
```

Without categories, a flat directory with 100+ cognitives becomes unmanageable. Categories provide:

- **Browsability** -- `cognit list --category frontend` shows only frontend skills
- **Scalability** -- hundreds of cognitives organized into 10-15 manageable groups
- **Semantic meaning** -- the category tells you what domain a cognitive serves
- **Team alignment** -- categories map to team roles (frontend team, QA team, etc.)

---

## 3. Default Categories

The SDK ships with a set of default categories. These are defined in `config/categories.yaml` and compiled at build time:

```yaml
# config/categories.yaml
categories:
  - name: general
    description: General-purpose cognitives that don't fit a specific domain
    isDefault: true

  - name: planning
    description: Project planning, task decomposition, estimation

  - name: qa
    description: Quality assurance, testing strategies, test writing

  - name: growth
    description: Growth engineering, analytics, experimentation, A/B testing

  - name: frontend
    description: Frontend development, UI/UX, component design

  - name: backend
    description: Backend services, APIs, server architecture

  - name: devops
    description: CI/CD, infrastructure, deployment, monitoring

  - name: security
    description: Application security, auditing, vulnerability prevention

  - name: data
    description: Data engineering, databases, ETL, analytics pipelines

  - name: mobile
    description: Mobile development (iOS, Android, React Native, Flutter)

  - name: infra
    description: Cloud infrastructure, networking, platform engineering
```

### 3.1 Default Category

The `general` category is the default. When a cognitive does not specify a category (neither in frontmatter nor via CLI flag), it is assigned to `general`.

---

## 4. Custom Categories

Users can define custom categories in their project configuration or global configuration.

### 4.1 Project-Level Custom Categories

In `.agents/cognit/config.json` (or `config.yaml`):

```json
{
  "categories": [
    {
      "name": "ml-ops",
      "description": "Machine learning operations and model deployment"
    },
    {
      "name": "design-system",
      "description": "UI component library and design tokens"
    }
  ]
}
```

### 4.2 Global Custom Categories

In `~/.agents/cognit/config.json`:

```json
{
  "categories": [
    {
      "name": "personal",
      "description": "Personal productivity cognitives"
    }
  ]
}
```

### 4.3 Category Resolution Order

When resolving available categories:

1. **Built-in defaults** (from `config/categories.yaml`)
2. **Global custom** (from `~/.agents/cognit/config.json`)
3. **Project custom** (from `.agents/cognit/config.json`)

Later definitions with the same name override earlier ones. Custom categories are merged with defaults, not replacing them.

---

## 5. Category Metadata

### 5.1 TypeScript Interface

```typescript
interface CategoryDefinition {
  /** Unique identifier (kebab-case). Used in directory paths and lock keys. */
  name: string;

  /** Human-readable description of what this category contains. */
  description: string;

  /** Whether this is the default category for uncategorized cognitives. */
  isDefault?: boolean;
}
```

### 5.2 Category Registry

```typescript
interface CategoryRegistry {
  /** Get all available categories (built-in + custom). */
  getAll(): CategoryDefinition[];

  /** Get a category by name. Returns undefined if not found. */
  get(name: string): CategoryDefinition | undefined;

  /** Check if a category name is valid (exists in registry). */
  isValid(name: string): boolean;

  /** Get the default category name. */
  getDefault(): string;

  /** Register a custom category. */
  register(category: CategoryDefinition): void;

  /** Load categories from a config file. */
  loadFromConfig(configPath: string): Promise<void>;

  /** Get categories with cognitive counts (from lock file). */
  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }>;
}
```

### 5.3 Implementation

```typescript
class CategoryRegistryImpl implements CategoryRegistry {
  private categories: Map<string, CategoryDefinition> = new Map();
  private defaultCategory: string = 'general';

  constructor(defaults: CategoryDefinition[]) {
    for (const cat of defaults) {
      this.categories.set(cat.name, cat);
      if (cat.isDefault) {
        this.defaultCategory = cat.name;
      }
    }
  }

  getAll(): CategoryDefinition[] {
    return Array.from(this.categories.values());
  }

  get(name: string): CategoryDefinition | undefined {
    return this.categories.get(name);
  }

  isValid(name: string): boolean {
    // Built-in categories are always valid; custom names are valid if they pass sanitization
    return this.categories.has(name) || /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name);
  }

  getDefault(): string {
    return this.defaultCategory;
  }

  register(category: CategoryDefinition): void {
    this.categories.set(category.name, category);
    if (category.isDefault) {
      this.defaultCategory = category.name;
    }
  }

  async loadFromConfig(configPath: string): Promise<void> {
    // Read and parse config file
    // Register each custom category
  }

  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }> {
    const counts = new Map<string, number>();

    for (const entry of Object.values(lockEntries)) {
      const count = counts.get(entry.category) ?? 0;
      counts.set(entry.category, count + 1);
    }

    return this.getAll().map(cat => ({
      ...cat,
      count: counts.get(cat.name) ?? 0,
    }));
  }
}
```

---

## 6. Installation Path Impact

Categories affect the central canonical path but NOT the agent-specific path.

### 6.1 Central Path (with category)

```
.agents/cognit/{type}/{category}/{name}/{FILE}.md
```

Examples:
```
.agents/cognit/skills/frontend/react-19/SKILL.md
.agents/cognit/skills/planning/task-decomposition/SKILL.md
.agents/cognit/prompts/backend/api-design/PROMPT.md
.agents/cognit/rules/security/owasp-top-10/RULE.md
.agents/cognit/agents/devops/ci-pipeline/AGENT.md
```

### 6.2 Agent Path (flattened, no category)

```
.{agent}/{type}/{name}/{FILE}.md
```

Examples:
```
.claude/skills/react-19/SKILL.md          -> ../../.agents/cognit/skills/frontend/react-19/
.claude/skills/task-decomposition/SKILL.md -> ../../.agents/cognit/skills/planning/task-decomposition/
.cursor/skills/react-19/SKILL.md          -> ../../.agents/cognit/skills/frontend/react-19/
```

### 6.3 Why Flatten

Most AI coding agents have a fixed directory structure:
- Claude: `.claude/skills/<name>/`
- Cursor: `.cursor/skills/<name>/`
- Codex: `.codex/skills/<name>/`

None of these support a category subdirectory. If the SDK created `.claude/skills/frontend/react-19/`, Claude would not recognize it. Flattening ensures agent compatibility.

### 6.4 Name Collision Handling

Because categories are flattened in agent directories, two cognitives with the same name in different categories would collide:

- `frontend/button-component/SKILL.md`
- `mobile/button-component/SKILL.md`

The SDK handles this by:
1. Warning the user during `add` if a name collision would occur
2. Requiring explicit `--force` to overwrite
3. Storing both in the lock file (different keys: `skill:frontend:button-component` vs `skill:mobile:button-component`)
4. In the agent directory, the last one installed wins (with a warning)

---

## 7. Category Flattening

### 7.1 When Flattening Occurs

Flattening happens during the symlink/copy step of installation. The installer:

1. Writes to canonical path: `.agents/cognit/skills/frontend/react-19/`
2. Creates symlink at agent path: `.claude/skills/react-19/` --> canonical path

The category (`frontend`) is present in the canonical path but absent from the agent path.

### 7.2 Implementation

```typescript
function getAgentPath(
  agent: AgentType,
  cognitiveType: CognitiveType,
  name: string,
  scope: InstallScope,
  projectRoot?: string
): string {
  // Agent path never includes category -- always flat
  const agentConfig = agents[agent];
  const dirs = agentConfig.dirs[cognitiveType];
  const base = scope === 'global' ? dirs.global : join(projectRoot, dirs.local);
  return join(base, sanitizeName(name));
}

function getCanonicalPath(
  cognitiveType: CognitiveType,
  category: string,
  name: string,
  scope: InstallScope,
  projectRoot?: string
): string {
  // Canonical path always includes category
  const base = scope === 'global' ? getGlobalBase() : join(projectRoot, '.agents', 'cognit');
  return join(base, COGNITIVE_SUBDIRS[cognitiveType], sanitizeName(category), sanitizeName(name));
}
```

---

## 8. Configuration

### 8.1 Where Categories Are Defined

| Source | Location | Scope |
|--------|----------|-------|
| Built-in | `packages/cognit-core/config/categories.yaml` | Compiled into SDK at build time |
| Global config | `~/.agents/cognit/config.json` | User-wide custom categories |
| Project config | `<project>/.agents/cognit/config.json` | Project-specific custom categories |
| Cognitive frontmatter | `category: frontend` in SKILL.md | Per-cognitive category assignment |

### 8.2 Config File Format

```json
{
  "categories": [
    {
      "name": "ml-ops",
      "description": "Machine learning operations"
    }
  ],
  "defaultCategory": "general"
}
```

### 8.3 Loading Order

```typescript
async function loadCategories(projectRoot?: string): Promise<CategoryRegistry> {
  const registry = new CategoryRegistryImpl(BUILT_IN_CATEGORIES);

  // Load global config
  const globalConfigPath = join(getGlobalBase(), 'config.json');
  if (await exists(globalConfigPath)) {
    await registry.loadFromConfig(globalConfigPath);
  }

  // Load project config (overrides global)
  if (projectRoot) {
    const projectConfigPath = join(projectRoot, '.agents', 'cognit', 'config.json');
    if (await exists(projectConfigPath)) {
      await registry.loadFromConfig(projectConfigPath);
    }
  }

  return registry;
}
```

---

## 9. Category Assignment

### 9.1 Manual Assignment (User Specifies)

The user can specify a category via CLI flag or interactive prompt:

```bash
# Via flag
cognit add owner/repo --category frontend

# During interactive prompt
# > Select category: [frontend, backend, planning, ...]
```

### 9.2 Automatic Assignment (From Metadata)

If the cognitive's frontmatter includes a `category` field, it is used automatically:

```markdown
---
name: React 19 Best Practices
category: frontend
---
```

### 9.3 Assignment Priority

1. **CLI flag** (`--category frontend`) -- highest priority
2. **Cognitive frontmatter** (`category: frontend` in YAML frontmatter)
3. **Default category** (`general`) -- fallback

```typescript
function resolveCategory(
  cliCategory: string | undefined,
  frontmatterCategory: string | undefined,
  registry: CategoryRegistry
): string {
  // CLI flag takes priority
  if (cliCategory) {
    return sanitizeName(cliCategory);
  }

  // Then frontmatter
  if (frontmatterCategory) {
    return sanitizeName(frontmatterCategory);
  }

  // Default
  return registry.getDefault();
}
```

---

## 10. Querying

### 10.1 List by Category

```typescript
// List all cognitives in a category
const frontendSkills = await sdk.list({
  category: 'frontend',
});

// List all categories with counts
const categories = sdk.categories.getWithCounts(lockEntries);
// => [{ name: 'frontend', description: '...', count: 5 }, ...]
```

### 10.2 Filter by Category

```typescript
// Filter installed cognitives
const results = await lockManager.query({
  category: 'security',
  cognitiveType: 'rule',
});
```

### 10.3 Search Across Categories

```typescript
// Search by name across all categories
const results = await sdk.list({
  search: 'react',
  // Returns matches from any category
});
```

### 10.4 CLI Examples

```bash
# List all categories
cognit categories

# List skills in a category
cognit list --category frontend

# List all skills grouped by category
cognit list --group-by category

# Search within a category
cognit find react --category frontend

# Move a cognitive to a different category
cognit move react-19 --category ui-framework
```

---

## 11. Lock File Integration

Categories are embedded in the lock file key and entry:

```json
{
  "entries": {
    "skill:frontend:react-19": {
      "name": "React 19 Best Practices",
      "cognitiveType": "skill",
      "category": "frontend",
      "..."
    }
  }
}
```

### 11.1 Key Structure

The lock key includes the category: `{type}:{category}:{name}`.

This means:
- Same cognitive name in different categories = different lock entries
- Changing a cognitive's category requires a remove + re-add (new key)
- The `move` operation handles this atomically

### 11.2 Category Queries on Lock File

```typescript
// Get all entries in a category
function getByCategory(
  entries: Record<string, CognitLockEntry>,
  category: string
): CognitLockEntry[] {
  return Object.values(entries).filter(e => e.category === category);
}

// Get category statistics
function getCategoryStats(
  entries: Record<string, CognitLockEntry>
): Map<string, { total: number; byType: Record<CognitiveType, number> }> {
  const stats = new Map();

  for (const entry of Object.values(entries)) {
    if (!stats.has(entry.category)) {
      stats.set(entry.category, { total: 0, byType: {} });
    }
    const cat = stats.get(entry.category);
    cat.total++;
    cat.byType[entry.cognitiveType] = (cat.byType[entry.cognitiveType] ?? 0) + 1;
  }

  return stats;
}
```

---

## 12. TypeScript Interfaces Summary

```typescript
// ── Category Definition ────────────────────────────────

interface CategoryDefinition {
  name: string;
  description: string;
  isDefault?: boolean;
}

// ── Category Registry ──────────────────────────────────

interface CategoryRegistry {
  getAll(): CategoryDefinition[];
  get(name: string): CategoryDefinition | undefined;
  isValid(name: string): boolean;
  getDefault(): string;
  register(category: CategoryDefinition): void;
  loadFromConfig(configPath: string): Promise<void>;
  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }>;
}

// ── Category in Cognitive Frontmatter ──────────────────

interface CognitiveFrontmatter {
  name: string;
  description: string;
  version?: string;
  category?: string;    // <-- Category assignment
  tags?: string[];
  author?: string;
  // ... type-specific fields
}

// ── Category in Lock Entry ─────────────────────────────

interface CognitLockEntry {
  // ...
  category: string;     // <-- Always present, defaults to 'general'
  // ...
}

// ── Category in Install Options ────────────────────────

interface InstallOptions {
  // ...
  category: string;     // <-- Defaults to 'general'
  // ...
}

// ── Category Query ─────────────────────────────────────

interface LockQueryFilter {
  category?: string;
  // ...
}

// ── Category Config ────────────────────────────────────

interface CognitConfig {
  categories?: CategoryDefinition[];
  defaultCategory?: string;
  // ...
}
```

---

## 13. Edge Cases

| Scenario | Handling |
|----------|----------|
| Unknown category in frontmatter | Accept it (custom categories are open-ended); register dynamically |
| Category name with special characters | `sanitizeName()` normalizes to kebab-case |
| Category renamed after install | Lock file retains old category; user must `cognit move` to update |
| Empty category | Defaults to `general` |
| Category directory has no cognitives | Left on disk (empty dirs are harmless); `cognit clean` can remove |
| Two cognitives, same name, different categories | Both install to canonical with different paths; agent dir has conflict (last wins with warning) |
| Agent that supports categories natively | Future: if an agent adds category support, the SDK can create nested agent dirs |
