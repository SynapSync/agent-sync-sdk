# API Reference

Complete reference for the `@synapsync/agent-sync-sdk` public API. For details on the type system, see [Type System](./type-system.md). For event types, see [Events](./events.md). For error handling, see [Errors](./errors.md).

## createAgentSyncSDK

Factory function that creates a fully configured SDK instance.

```typescript
function createAgentSyncSDK(userConfig?: Partial<SDKConfig>): AgentSyncSDK
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userConfig` | `Partial<SDKConfig>` | Optional partial configuration. Merged with defaults. See [Getting Started](./getting-started.md) for all config options. |

**Returns:** `AgentSyncSDK` — A fully initialized SDK instance.

**Example:**

```typescript
import { createAgentSyncSDK } from '@synapsync/agent-sync-sdk';

// Default configuration
const sdk = createAgentSyncSDK();

// Custom configuration
const sdk = createAgentSyncSDK({
  cwd: '/my/project',
  providers: {
    githubToken: process.env.GITHUB_TOKEN,
    custom: [],
  },
});
```

---

## AgentSyncSDK Interface

The `AgentSyncSDK` interface exposes 8 operations, 4 accessors, 2 event subscription methods, and 1 lifecycle method.

---

## Operations

### add

Installs cognitives from a source into one or more agent directories. The source string is resolved through the provider chain (Custom, GitHub, Local, Mintlify, HuggingFace, WellKnown, DirectURL) to locate cognitive files.

```typescript
add(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `string` | Source identifier. Can be a GitHub `owner/repo`, a local path, a URL, or any format recognized by a registered provider. |
| `options` | `Partial<AddOptions>` | Installation options. |

**AddOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agents` | `AgentType[]` | `[]` | Target agents to install into. If empty, uses all available agents. |
| `cognitiveType` | `CognitiveType` | `undefined` | Filter to a specific cognitive type (`'skill'`, `'agent'`, `'prompt'`, `'rule'`). |
| `cognitiveNames` | `string[]` | `undefined` | Install only cognitives matching these names. |
| `subpath` | `string` | `undefined` | Subdirectory within the source to scan for cognitives. |
| `mode` | `InstallMode` | `'symlink'` | Installation mode: `'symlink'` creates symbolic links from agent directories to the canonical store; `'copy'` creates independent copies. |
| `scope` | `InstallScope` | `'project'` | Installation scope: `'project'` installs relative to `cwd`; `'global'` installs relative to `homeDir`. |
| `category` | `string` | `''` | Optional category tag for organizational purposes. |
| `confirmed` | `boolean` | `false` | If `true`, skips the confirmation step and installs immediately. If `false`, returns available cognitives without installing. |

**AddResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed without critical errors. |
| `installed` | `InstalledCognitiveInfo[]` | List of successfully installed cognitives with metadata. |
| `failed` | `FailedInstallInfo[]` | List of cognitives that failed to install, with error details. |
| `available` | `AvailableCognitive[] \| undefined` | When `confirmed` is `false`, the list of cognitives available for installation. |
| `source` | `SourceInfo` | Resolved source information (provider, URI, etc.). |
| `message` | `string` | Human-readable summary of the operation. |

**Example:**

```typescript
import { createAgentSyncSDK, isOk, isErr } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK();

// Preview available cognitives (confirmed: false)
const preview = await sdk.add('owner/repo');
if (isOk(preview) && preview.value.available) {
  for (const cog of preview.value.available) {
    console.log(`Available: ${cog.name} (${cog.cognitiveType})`);
  }
}

// Install with confirmation
const result = await sdk.add('owner/repo', {
  agents: ['claude-code', 'cursor'],
  cognitiveType: 'skill',
  mode: 'symlink',
  scope: 'project',
  confirmed: true,
});

if (isOk(result)) {
  console.log(result.value.message);
  for (const item of result.value.installed) {
    console.log(`  Installed: ${item.name} -> ${item.path}`);
  }
} else {
  console.error(`Error [${result.error.code}]: ${result.error.message}`);
}

await sdk.dispose();
```

---

### remove

Removes one or more installed cognitives by name. Cleans up symlinks, copies, and lock file entries.

```typescript
remove(names: readonly string[], options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `names` | `readonly string[]` | Names of the cognitives to remove. |
| `options` | `Partial<RemoveOptions>` | Removal options. |

**RemoveOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agents` | `AgentType[]` | `undefined` | If specified, remove only from these agents. If omitted, removes from all agents where the cognitive is installed. |
| `scope` | `InstallScope` | `'project'` | Scope to remove from: `'project'` or `'global'`. |
| `confirmed` | `boolean` | `false` | If `true`, performs the removal immediately. If `false`, returns what would be removed without acting. |

**RemoveResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed without critical errors. |
| `removed` | `RemovedCognitiveInfo[]` | List of successfully removed cognitives. |
| `notFound` | `string[]` | Names that were requested but not found in the installation. |
| `message` | `string` | Human-readable summary of the operation. |

**Example:**

```typescript
const result = await sdk.remove(['code-review-skill', 'testing-agent'], {
  confirmed: true,
});

if (isOk(result)) {
  console.log(result.value.message);
  console.log(`Removed: ${result.value.removed.length}`);
  console.log(`Not found: ${result.value.notFound.join(', ')}`);
}
```

---

### list

Lists all installed cognitives, optionally filtered by scope, type, or agent.

```typescript
list(options?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Partial<ListOptions>` | Filtering options. |

**ListOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | `InstallScope` | `'project'` | Scope to list from: `'project'` or `'global'`. |
| `cognitiveType` | `CognitiveType` | `undefined` | Filter by cognitive type. |
| `agent` | `AgentType` | `undefined` | Filter to cognitives installed for a specific agent. |

**ListResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed successfully. |
| `cognitives` | `ListedCognitive[]` | Array of installed cognitive descriptors. |
| `count` | `number` | Total number of cognitives returned. |
| `message` | `string` | Human-readable summary. |

**Example:**

```typescript
// List all installed cognitives
const all = await sdk.list();

// List only skills installed for cursor
const cursorSkills = await sdk.list({
  cognitiveType: 'skill',
  agent: 'cursor',
});

if (isOk(cursorSkills)) {
  console.log(`Cursor has ${cursorSkills.value.count} skills`);
  for (const c of cursorSkills.value.cognitives) {
    console.log(`  ${c.name}: ${c.source}`);
  }
}
```

---

### find

Discovers available cognitives in a source without installing them. Useful for browsing repositories or registries.

```typescript
find(source: string, options?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `source` | `string` | Source identifier to search in. |
| `options` | `Partial<FindOptions>` | Search options. |

**FindOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cognitiveType` | `CognitiveType` | `undefined` | Filter results to a specific cognitive type. |
| `limit` | `number` | `undefined` | Maximum number of results to return. |

**FindResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed successfully. |
| `results` | `DiscoveredCognitive[]` | Array of discovered cognitive descriptors. |
| `total` | `number` | Total number of cognitives found (may exceed `results.length` if `limit` is applied). |
| `source` | `string` | The resolved source string. |
| `message` | `string` | Human-readable summary. |

**Example:**

```typescript
const result = await sdk.find('synapsync/community-cognitives', {
  cognitiveType: 'skill',
  limit: 10,
});

if (isOk(result)) {
  console.log(`Found ${result.value.total} skills (showing ${result.value.results.length})`);
  for (const r of result.value.results) {
    console.log(`  ${r.name}: ${r.description}`);
  }
}
```

---

### update

Updates installed cognitives to their latest versions from their original sources. Can perform a dry run to check for available updates without applying them.

```typescript
update(options?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Partial<UpdateOptions>` | Update options. |

**UpdateOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `names` | `string[]` | `undefined` | If specified, update only these cognitives. If omitted, updates all installed cognitives. |
| `scope` | `InstallScope` | `'project'` | Scope to update: `'project'` or `'global'`. |
| `checkOnly` | `boolean` | `false` | If `true`, checks for updates without applying them. |
| `confirmed` | `boolean` | `false` | If `true`, applies updates immediately. If `false`, returns available updates without applying. |

**UpdateResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed without critical errors. |
| `updates` | `UpdateInfo[]` | List of cognitives that were updated (or would be updated if `checkOnly`). |
| `upToDate` | `string[]` | Names of cognitives that are already at their latest version. |
| `errors` | `UpdateError[]` | List of cognitives that failed to update, with error details. |
| `message` | `string` | Human-readable summary. |

**Example:**

```typescript
// Check for available updates
const check = await sdk.update({ checkOnly: true });

if (isOk(check)) {
  console.log(`Updates available: ${check.value.updates.length}`);
  console.log(`Up to date: ${check.value.upToDate.length}`);

  for (const u of check.value.updates) {
    console.log(`  ${u.name}: ${u.currentVersion} -> ${u.latestVersion}`);
  }
}

// Apply all updates
const result = await sdk.update({ confirmed: true });

if (isOk(result)) {
  console.log(result.value.message);
}
```

---

### sync

Detects and repairs inconsistencies between the lock file, canonical store, and agent directories. Fixes broken symlinks, missing files, orphaned entries, and lock mismatches.

```typescript
sync(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Partial<SyncOptions>` | Sync options. |

**SyncOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | `InstallScope` | `'project'` | Scope to sync: `'project'` or `'global'`. |
| `dryRun` | `boolean` | `false` | If `true`, reports issues without fixing them. |
| `confirmed` | `boolean` | `false` | If `true`, applies fixes immediately. |

**SyncResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the operation completed without critical errors. |
| `issues` | `SyncIssue[]` | List of detected issues. Each issue includes a `type` field. |
| `fixed` | `number` | Number of issues that were repaired. |
| `remaining` | `number` | Number of issues that could not be repaired automatically. |
| `message` | `string` | Human-readable summary. |

**SyncIssueType:**

| Value | Description |
|-------|-------------|
| `'missing_files'` | Files referenced in the lock file are missing from disk. |
| `'broken_symlink'` | A symlink points to a non-existent target. |
| `'orphaned_files'` | Files exist on disk but have no corresponding lock file entry. |
| `'lock_mismatch'` | Lock file entries do not match the actual file contents or state. |

**Example:**

```typescript
// Dry run to see issues
const dryRun = await sdk.sync({ dryRun: true });

if (isOk(dryRun)) {
  console.log(`Issues found: ${dryRun.value.issues.length}`);
  for (const issue of dryRun.value.issues) {
    console.log(`  [${issue.type}] ${issue.message}`);
  }
}

// Fix all issues
const result = await sdk.sync({ confirmed: true });

if (isOk(result)) {
  console.log(`Fixed: ${result.value.fixed}, Remaining: ${result.value.remaining}`);
}
```

---

### check

Performs a health check on the installation. Verifies canonical files, agent directories, symlink integrity, content hashes, and lock file consistency.

```typescript
check(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Partial<CheckOptions>` | Check options. |

**CheckOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | `InstallScope` | `'project'` | Scope to check: `'project'` or `'global'`. |

**CheckResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` if no errors were found (warnings are allowed). |
| `healthy` | `string[]` | Names of cognitives that passed all checks. |
| `issues` | `CheckIssue[]` | List of detected issues, each with `type`, `severity`, and `message`. |
| `message` | `string` | Human-readable summary. |

**CheckIssueType:**

| Value | Description |
|-------|-------------|
| `'missing_canonical'` | The canonical file in the agents directory is missing. |
| `'missing_agent_dir'` | An expected agent directory does not exist. |
| `'broken_symlink'` | A symlink in an agent directory points to a non-existent target. |
| `'hash_mismatch'` | The file content hash does not match the lock file record. |
| `'lock_orphan'` | A lock file entry exists with no corresponding file on disk. |
| `'filesystem_orphan'` | A file exists on disk with no corresponding lock file entry. |

**CheckSeverity:**

| Value | Description |
|-------|-------------|
| `'error'` | A critical issue that prevents the cognitive from functioning correctly. |
| `'warning'` | A non-critical issue that should be investigated but does not block operation. |

**Example:**

```typescript
const result = await sdk.check();

if (isOk(result)) {
  const { healthy, issues, message } = result.value;

  console.log(message);
  console.log(`Healthy: ${healthy.length}`);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  console.log(`Errors: ${errors.length}, Warnings: ${warnings.length}`);

  for (const issue of issues) {
    console.log(`  [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
  }
}
```

---

### init

Scaffolds a new cognitive with the correct directory structure and frontmatter template.

```typescript
init(name: string, cognitiveType: CognitiveType, options?: Partial<InitOptions>): Promise<Result<InitResult, CognitError>>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Name for the new cognitive. |
| `cognitiveType` | `CognitiveType` | Type of cognitive to create: `'skill'`, `'agent'`, `'prompt'`, or `'rule'`. |
| `options` | `Partial<InitOptions>` | Initialization options. |

**InitOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `outputDir` | `string` | `undefined` | Directory to create the cognitive in. Defaults to the appropriate subdirectory within the agents directory. |
| `description` | `string` | `undefined` | Description to include in the generated frontmatter. |

**InitResult:**

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the cognitive was created successfully. |
| `path` | `string` | Absolute path to the created cognitive directory. |
| `files` | `string[]` | List of files that were created. |
| `cognitiveType` | `CognitiveType` | The type of cognitive that was created. |
| `message` | `string` | Human-readable summary. |

**Example:**

```typescript
const result = await sdk.init('code-review', 'skill', {
  description: 'A skill for performing thorough code reviews',
});

if (isOk(result)) {
  console.log(`Created ${result.value.cognitiveType} at ${result.value.path}`);
  console.log('Files:');
  for (const file of result.value.files) {
    console.log(`  ${file}`);
  }
}
```

---

## Accessors

### events

Access the event bus directly for advanced event management.

```typescript
readonly events: EventBus
```

The `EventBus` instance allows subscribing to, unsubscribing from, and emitting events. For the full list of 26+ event types, see [Events](./events.md).

```typescript
const bus = sdk.events;
bus.on('add:start', (payload) => { /* ... */ });
```

---

### config

Read the fully resolved SDK configuration. This is the result of merging user-provided config with defaults.

```typescript
readonly config: Readonly<SDKConfig>
```

```typescript
console.log(`Working directory: ${sdk.config.cwd}`);
console.log(`Agents directory: ${sdk.config.agentsDir}`);
console.log(`Lock file: ${sdk.config.lockFileName}`);
```

---

### agents

Access the agent registry for querying and managing agent definitions.

```typescript
readonly agents: AgentRegistry
```

The `AgentRegistry` provides methods to look up agent configurations, list all registered agents, and register new agents at runtime.

```typescript
const allAgents = sdk.agents.getAll();
const claude = sdk.agents.get('claude-code');

if (claude) {
  console.log(`${claude.displayName} -> ${claude.localRoot}`);
}
```

---

### providers

Access the provider registry for querying and managing source providers.

```typescript
readonly providers: ProviderRegistry
```

The `ProviderRegistry` manages the chain of source providers used to resolve source strings into cognitive file locations. For details on built-in and custom providers, see [Providers](./providers.md).

```typescript
const allProviders = sdk.providers.getAll();
for (const p of allProviders) {
  console.log(`${p.name} (priority: ${p.priority})`);
}
```

---

## Event Subscription

### on

Subscribe to a named SDK event. The handler is called every time the event fires.

```typescript
on<K extends keyof SDKEventMap>(
  event: K,
  handler: (payload: SDKEventMap[K]) => void
): Unsubscribe
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `K` | The event name (e.g., `'add:start'`, `'remove:complete'`, `'sync:issue'`). |
| `handler` | `(payload: SDKEventMap[K]) => void` | Callback invoked with the event payload. |

**Returns:** `Unsubscribe` — A function that, when called, removes the subscription.

**Example:**

```typescript
const unsubscribe = sdk.on('add:complete', (payload) => {
  console.log(`Add finished: ${payload.message}`);
});

// Later, to stop listening:
unsubscribe();
```

---

### once

Subscribe to a named SDK event, but only fire the handler once. The subscription is automatically removed after the first invocation.

```typescript
once<K extends keyof SDKEventMap>(
  event: K,
  handler: (payload: SDKEventMap[K]) => void
): Unsubscribe
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `K` | The event name. |
| `handler` | `(payload: SDKEventMap[K]) => void` | Callback invoked once with the event payload. |

**Returns:** `Unsubscribe` — A function that, when called, removes the subscription (if it has not already fired).

**Example:**

```typescript
sdk.once('sync:complete', (payload) => {
  console.log(`First sync done: fixed ${payload.fixed} issues`);
});
```

---

## Lifecycle

### dispose

Clean up all internal resources, including event subscriptions, temporary directories, and provider connections. Always call this when you are done with the SDK instance.

```typescript
dispose(): Promise<void>
```

**Example:**

```typescript
const sdk = createAgentSyncSDK();

try {
  // ... use the SDK ...
} finally {
  await sdk.dispose();
}
```

---

## Type Reference

All operations return `Result<T, CognitError>`. Use the `isOk` and `isErr` type guards to narrow the result:

```typescript
import { isOk, isErr } from '@synapsync/agent-sync-sdk';

const result = await sdk.list();

if (isOk(result)) {
  // result.value is ListResult
  console.log(result.value.count);
}

if (isErr(result)) {
  // result.error is CognitError
  console.error(result.error.code, result.error.message);
}
```

For full details on the `Result<T, E>` pattern, branded types, and all type definitions, see [Type System](./type-system.md).

For the complete error taxonomy and `CognitError` structure, see [Errors](./errors.md).

For the full event map and payload types, see [Events](./events.md).
