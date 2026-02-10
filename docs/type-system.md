# Type System

The `@synapsync/agent-sync-sdk` type system is designed around compile-time safety, immutability, and explicit error handling. This document covers the core types, branded primitives, configuration interfaces, and data structures used throughout the SDK.

---

## Result\<T, E\>

The SDK uses a discriminated union `Result` type instead of throwing exceptions. Every public API method returns a `Result`, making error handling explicit and type-safe.

```typescript
type Result<T, E extends CognitError = CognitError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

### Helper Functions

All helpers are exported from the package root (`@synapsync/agent-sync-sdk`).

| Function | Signature | Description |
|----------|-----------|-------------|
| `ok` | `ok<T>(value: T): Result<T, never>` | Create a success result |
| `err` | `err<E extends CognitError>(error: E): Result<never, E>` | Create an error result |
| `isOk` | `isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T }` | Type guard for success |
| `isErr` | `isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E }` | Type guard for error |
| `unwrap` | `unwrap<T, E>(result: Result<T, E>): T` | Extract value or throw the error |
| `mapResult` | `mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>` | Transform the success value |

### Usage Examples

**Basic type narrowing with `isOk` / `isErr`:**

```typescript
import { isOk, isErr } from '@synapsync/agent-sync-sdk';

const result = await sdk.list();

if (isOk(result)) {
  // TypeScript knows result.value is available here
  for (const cognitive of result.value.cognitives) {
    console.log(cognitive.name, cognitive.type);
  }
} else {
  // TypeScript knows result.error is a CognitError here
  console.error(`[${result.error.code}] ${result.error.message}`);
}
```

**Using `unwrap` when you want to throw on failure:**

```typescript
import { unwrap } from '@synapsync/agent-sync-sdk';

// Throws the CognitError if result is not ok
const value = unwrap(await sdk.list());
console.log(value.cognitives.length);
```

**Transforming results with `mapResult`:**

```typescript
import { mapResult, isOk } from '@synapsync/agent-sync-sdk';

const result = await sdk.list();
const names = mapResult(result, (value) => value.cognitives.map((c) => c.name));

if (isOk(names)) {
  console.log('Installed cognitives:', names.value.join(', '));
}
```

**Creating results in custom code:**

```typescript
import { ok, err, ConfigError } from '@synapsync/agent-sync-sdk';

function loadSettings(): Result<Settings> {
  const raw = readSettingsFile();
  if (!raw) {
    return err(new ConfigError('Settings file not found'));
  }
  return ok(parseSettings(raw));
}
```

---

## Branded Types

The SDK uses branded types to prevent accidental misuse of plain strings where specific semantics are required. A branded type is a `string` at runtime but carries a compile-time tag that makes it incompatible with other branded types or raw strings.

```typescript
type Brand<T, B extends string> = T & { readonly __brand: B };
```

### Available Branded Types

| Type | Brand | Example Value | Validation Pattern |
|------|-------|---------------|-------------------|
| `AgentName` | `'AgentName'` | `"claude-code"` | `/^[a-z0-9][a-z0-9-]*$/` |
| `CognitiveName` | `'CognitiveName'` | `"react-best-practices"` | Lowercase alphanumeric with hyphens |
| `SafeName` | `'SafeName'` | `"my-cognitive"` | Filesystem-safe characters only |
| `SourceIdentifier` | `'SourceIdentifier'` | `"owner/repo"` | Provider-specific format |

### Constructors

Constructors validate the input and return the branded type. They throw if the input is invalid.

```typescript
import { agentName, cognitiveName, safeName, sourceIdentifier } from '@synapsync/agent-sync-sdk';

const agent = agentName('claude-code');       // AgentName
const cognitive = cognitiveName('react-tips'); // CognitiveName
const safe = safeName('my-cognitive');          // SafeName
const source = sourceIdentifier('owner/repo'); // SourceIdentifier
```

**Invalid inputs throw:**

```typescript
agentName('Invalid Name!'); // Throws — uppercase and special characters not allowed
agentName('-starts-with-dash'); // Throws — must start with alphanumeric
```

### Type Guards

Type guards return `boolean` and can be used for runtime validation without throwing.

```typescript
import { isAgentName, isCognitiveName } from '@synapsync/agent-sync-sdk';

const input = getUserInput();

if (isAgentName(input)) {
  // input is narrowed to AgentName
  registerAgent(input);
} else {
  console.error('Invalid agent name format');
}

if (isCognitiveName(input)) {
  // input is narrowed to CognitiveName
  lookupCognitive(input);
}
```

---

## Core Interfaces

### Cognitive

A parsed cognitive file representing a skill, prompt, rule, or agent cognitive loaded from disk.

```typescript
interface Cognitive {
  readonly name: CognitiveName;
  readonly description: string;
  readonly path: string;
  readonly type: CognitiveType;
  readonly rawContent: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
```

| Field | Description |
|-------|-------------|
| `name` | The unique cognitive name (branded) |
| `description` | Human-readable description extracted from the file |
| `path` | Absolute filesystem path to the cognitive file |
| `type` | One of `'skill'`, `'agent'`, `'prompt'`, `'rule'` |
| `rawContent` | The full raw markdown content of the file |
| `metadata` | Parsed frontmatter or additional metadata |

### Cognitive Subtypes

The SDK provides narrowed subtypes with the `type` field constrained to a literal:

- **`Skill`** — Same as `Cognitive` but with `type: 'skill'`
- **`Prompt`** — Same as `Cognitive` but with `type: 'prompt'`
- **`Rule`** — Same as `Cognitive` but with `type: 'rule'`
- **`AgentCognitive`** — Same as `Cognitive` but with `type: 'agent'`

These subtypes allow functions to accept or return only a specific cognitive kind.

### RemoteCognitive

A cognitive fetched from a remote provider (GitHub, local path, well-known endpoint, etc.).

```typescript
interface RemoteCognitive {
  readonly name: string;
  readonly description: string;
  readonly content: string;
  readonly installName: SafeName;
  readonly sourceUrl: string;
  readonly providerId: string;
  readonly sourceIdentifier: SourceIdentifier;
  readonly type: CognitiveType;
  readonly metadata: Readonly<Record<string, unknown>>;
}
```

| Field | Description |
|-------|-------------|
| `name` | Display name of the cognitive |
| `description` | Human-readable description |
| `content` | The full markdown content |
| `installName` | Filesystem-safe name for installation |
| `sourceUrl` | The original URL or path used to fetch |
| `providerId` | The provider that resolved this cognitive (e.g., `'github'`) |
| `sourceIdentifier` | Canonical source identifier (e.g., `"owner/repo"`) |
| `type` | The cognitive type |
| `metadata` | Additional metadata from the source |

### CognitiveType

```typescript
type CognitiveType = 'skill' | 'agent' | 'prompt' | 'rule';
```

### CognitiveTypeConfig

Each cognitive type maps to a subdirectory name and a standard filename:

```typescript
const COGNITIVE_TYPE_CONFIGS = {
  skill:  { subdir: 'skills',  fileName: 'SKILL.md' },
  agent:  { subdir: 'agents',  fileName: 'AGENT.md' },
  prompt: { subdir: 'prompts', fileName: 'PROMPT.md' },
  rule:   { subdir: 'rules',   fileName: 'RULE.md' },
} as const;
```

For example, a skill named `react-best-practices` would be stored at `<agentDir>/skills/react-best-practices/SKILL.md`.

### CognitiveRef

A lightweight reference to a cognitive, used in discovery results and listings.

```typescript
interface CognitiveRef {
  name: CognitiveName;
  type: CognitiveType;
  path: string;
  description: string;
}
```

---

## Configuration Types

### SDKConfig

The top-level configuration object passed to `createAgentSyncSDK` (after merging with defaults).

```typescript
interface SDKConfig {
  readonly agentsDir: string;
  readonly lockFileName: string;
  readonly cwd: string;
  readonly homeDir: string;
  readonly fs: FileSystemAdapter;
  readonly git: Readonly<GitConfig>;
  readonly providers: Readonly<ProviderConfig>;
  readonly agents: Readonly<AgentRegistryConfig>;
  readonly telemetry: Readonly<TelemetryConfig>;
}
```

| Field | Description |
|-------|-------------|
| `agentsDir` | Directory name where agent cognitives are stored (default: `'.agents'`) |
| `lockFileName` | Name of the lock file (default: `'cognitives-lock.json'`) |
| `cwd` | Current working directory for project-scope operations |
| `homeDir` | User home directory for global-scope operations |
| `fs` | Filesystem adapter (defaults to `NodeFileSystem`) |
| `git` | Git operation settings |
| `providers` | Provider configuration |
| `agents` | Agent registry configuration |
| `telemetry` | Telemetry settings |

### GitConfig

```typescript
interface GitConfig {
  cloneTimeoutMs: number;
  depth: number;
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `cloneTimeoutMs` | `30000` | Timeout for git clone operations in milliseconds |
| `depth` | `1` | Clone depth (shallow clone) |

### ProviderConfig

```typescript
interface ProviderConfig {
  githubToken?: string;
  custom: readonly HostProvider[];
}
```

| Field | Description |
|-------|-------------|
| `githubToken` | GitHub personal access token for private repos (falls back to `GITHUB_TOKEN` / `GH_TOKEN` env vars) |
| `custom` | Array of custom `HostProvider` implementations registered before built-in providers |

### AgentRegistryConfig

```typescript
interface AgentRegistryConfig {
  definitionsPath?: string;
  additional: readonly AgentConfig[];
}
```

| Field | Description |
|-------|-------------|
| `definitionsPath` | Path to a JSON file containing agent definitions |
| `additional` | Additional agent configurations to register alongside built-in ones |

### TelemetryConfig

```typescript
interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `false` | Whether telemetry collection is enabled |
| `endpoint` | `undefined` | Custom telemetry endpoint URL |

### FileSystemAdapter

The `FileSystemAdapter` interface abstracts all filesystem operations, enabling testing with in-memory implementations and custom storage backends.

```typescript
interface FileSystemAdapter {
  readFile(path: string, encoding?: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<FileStat>;
  lstat(path: string): Promise<FileStat>;
  symlink(target: string, path: string): Promise<void>;
  readlink(path: string): Promise<string>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyDirectory(source: string, destination: string): Promise<void>;
}
```

**Built-in implementations:**

- **`NodeFileSystem`** — Uses Node.js `fs/promises` under the hood. This is the default when no `fs` option is provided.
- **`createMemoryFs()`** — Returns an in-memory filesystem adapter, useful for unit testing.

Both are exported from the package root:

```typescript
import { NodeFileSystem, createMemoryFs } from '@synapsync/agent-sync-sdk';
```

---

## Lock Types

### LockFile

The lock file tracks all installed cognitives, their sources, and content hashes for integrity checking.

```typescript
interface LockFile {
  readonly version: 5;  // LOCK_VERSION constant
  readonly cognitives: Readonly<Record<string, LockEntry>>;
  readonly lastSelectedAgents?: readonly string[];
}
```

| Field | Description |
|-------|-------------|
| `version` | Lock file format version. Current version is `5` (exported as `LOCK_VERSION`). |
| `cognitives` | Map of lock keys to lock entries |
| `lastSelectedAgents` | Optional list of agent names selected in the last interactive session |

**Lock key format:** Keys follow the pattern `"{cognitiveType}:{name}"`.

Examples:
- `"skill:react-best-practices"`
- `"rule:no-console-log"`
- `"agent:code-reviewer"`
- `"prompt:commit-message"`

### LockEntry

```typescript
interface LockEntry {
  readonly source: SourceIdentifier;
  readonly sourceType: string;
  readonly sourceUrl: string;
  readonly cognitivePath?: string;
  readonly contentHash: string;
  readonly cognitiveType: CognitiveType;
  readonly installedAt: string;  // ISO 8601
  readonly updatedAt: string;    // ISO 8601
}
```

| Field | Description |
|-------|-------------|
| `source` | Canonical source identifier (e.g., `"owner/repo"`) |
| `sourceType` | Provider type that installed this cognitive (e.g., `"github"`) |
| `sourceUrl` | The original URL or path used during installation |
| `cognitivePath` | Optional subpath within the source |
| `contentHash` | SHA-256 hash of the cognitive content for integrity checking |
| `cognitiveType` | The type of cognitive (`'skill'`, `'agent'`, `'prompt'`, `'rule'`) |
| `installedAt` | ISO 8601 timestamp of first installation |
| `updatedAt` | ISO 8601 timestamp of last update |

---

## Install Types

### InstallMode

```typescript
type InstallMode = 'symlink' | 'copy';
```

- **`'symlink'`** — Creates a symbolic link from the agent directory to the cognitive source. Preferred for local development as changes propagate automatically.
- **`'copy'`** — Copies the cognitive file into the agent directory. Used as a fallback when symlinks fail or for remote sources.

### InstallScope

```typescript
type InstallScope = 'project' | 'global';
```

- **`'project'`** — Installs into the project-level agents directory (`<cwd>/<agentsDir>`).
- **`'global'`** — Installs into the global agents directory (`<homeDir>/<agentsDir>`).

### InstallTarget

```typescript
interface InstallTarget {
  agent: AgentType;
  scope: InstallScope;
  mode: InstallMode;
}
```

Specifies where and how a cognitive should be installed.

### InstallResult

```typescript
interface InstallResult {
  success: boolean;
  agent: AgentType;
  cognitiveName: string;
  cognitiveType: CognitiveType;
  path: string;
  canonicalPath?: string;
  mode: InstallMode;
  symlinkFailed?: boolean;
  error?: string;
}
```

| Field | Description |
|-------|-------------|
| `success` | Whether the installation succeeded |
| `agent` | The target agent |
| `cognitiveName` | Name of the installed cognitive |
| `cognitiveType` | Type of the installed cognitive |
| `path` | Final installation path |
| `canonicalPath` | Resolved canonical path (for symlinks, the target path) |
| `mode` | The install mode that was actually used |
| `symlinkFailed` | `true` if symlink was requested but fell back to copy |
| `error` | Error message if `success` is `false` |

---

## See Also

- [API Reference](./api-reference.md) — Full SDK method signatures and return types
- [Error Handling](./errors.md) — Error classes, codes, and handling patterns
