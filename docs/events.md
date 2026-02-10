# Event System

The SDK includes a typed event system that provides visibility into every operation. Events are useful for building progress indicators, logging, debugging, and telemetry integrations. All 27 events are fully typed via the `SDKEventMap` interface.

---

## EventBus Interface

The core event bus provides standard pub/sub methods:

```typescript
interface EventBus {
  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void;
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
}

type Unsubscribe = () => void;
```

| Method | Description |
|--------|-------------|
| `emit` | Dispatches an event to all registered handlers for that event name. |
| `on` | Registers a handler that is called every time the event fires. Returns an `Unsubscribe` function. |
| `once` | Registers a handler that is called only the first time the event fires, then automatically unsubscribes. Returns an `Unsubscribe` function. |

### SDK Convenience Methods

The SDK instance exposes `on` and `once` directly, so you do not need to access the event bus separately:

```typescript
const sdk = createAgentSyncSDK();

// Subscribe to events directly on the SDK instance
sdk.on('operation:start', (payload) => {
  console.log(`Starting: ${payload.operation}`);
});

// One-time listener
const unsub = sdk.once('sdk:initialized', (payload) => {
  console.log('SDK ready, config hash:', payload.configHash);
});

// Unsubscribe manually if needed (before the event fires)
unsub();
```

---

## Full SDKEventMap

The SDK emits 27 events organized into 9 categories. Each event has a strongly typed payload.

### SDK Lifecycle (2 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `sdk:initialized` | `{ configHash: string }` | Fired when the SDK has been fully initialized. The `configHash` is a hash of the resolved configuration. |
| `sdk:error` | `{ error: CognitError }` | Fired when an unhandled SDK-level error occurs. |

### Operation Lifecycle (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `operation:start` | `{ operation: string, options: unknown }` | Fired at the beginning of any SDK operation (`add`, `remove`, `update`, `list`, `sync`, `detect`). |
| `operation:complete` | `{ operation: string, result: unknown, durationMs: number }` | Fired when an operation completes successfully. Includes wall-clock duration. |
| `operation:error` | `{ operation: string, error: CognitError }` | Fired when an operation fails. |

### Discovery (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `discovery:start` | `{ path: string }` | Fired when the SDK begins scanning a directory for cognitives. |
| `discovery:found` | `{ cognitive: CognitiveRef, type: CognitiveType }` | Fired each time a cognitive file is discovered during scanning. |
| `discovery:complete` | `{ count: number, durationMs: number }` | Fired when discovery finishes. Reports total count and duration. |

### Provider (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `provider:fetch:start` | `{ providerId: string, url: string }` | Fired when a provider begins fetching from a source. |
| `provider:fetch:complete` | `{ providerId: string, url: string, found: boolean }` | Fired when a provider fetch completes. `found` indicates whether cognitives were returned. |
| `provider:fetch:error` | `{ providerId: string, url: string, error: string }` | Fired when a provider fetch fails. |

### Installer (4 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `install:start` | `{ cognitive: string, agent: AgentType, mode: InstallMode }` | Fired when installation of a cognitive begins for a specific agent. |
| `install:symlink` | `{ source: string, target: string }` | Fired when a symlink is created during installation. |
| `install:copy` | `{ source: string, target: string }` | Fired when a file copy is performed during installation. |
| `install:complete` | `{ cognitive: string, agent: AgentType, result: InstallResult }` | Fired when installation of a cognitive completes for a specific agent. |

### Lock (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `lock:read` | `{ path: string }` | Fired when the lock file is read from disk. |
| `lock:write` | `{ path: string, entryCount: number }` | Fired when the lock file is written to disk. `entryCount` is the number of entries in the file. |
| `lock:migrate` | `{ fromVersion: number, toVersion: number }` | Fired when the lock file is migrated from an older format version to the current version. |

### Git (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `git:clone:start` | `{ url: string }` | Fired when a git clone operation begins. |
| `git:clone:complete` | `{ url: string, path: string, durationMs: number }` | Fired when a git clone completes successfully. Includes the local clone path and duration. |
| `git:clone:error` | `{ url: string, error: string }` | Fired when a git clone operation fails. |

### Agent Detection (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `agent:detect:start` | `Record<string, never>` | Fired when agent detection begins. Payload is an empty object. |
| `agent:detect:found` | `{ agent: AgentType, displayName: string }` | Fired each time an installed agent is detected in the environment. |
| `agent:detect:complete` | `{ results: AgentDetectionResult[], durationMs: number }` | Fired when agent detection completes. Includes all detection results and duration. |

### Progress (3 events)

| Event | Payload | Description |
|-------|---------|-------------|
| `progress:start` | `{ id: string, message: string, total?: number }` | Fired when a trackable operation begins. `id` is unique per operation. `total` is provided when the number of steps is known. |
| `progress:update` | `{ id: string, message: string, current?: number }` | Fired as a trackable operation progresses. `current` is the current step number when applicable. |
| `progress:complete` | `{ id: string, message: string }` | Fired when a trackable operation finishes. |

---

## Usage Examples

### Progress Tracking

Build a progress indicator for CLI or UI integrations:

```typescript
const sdk = createAgentSyncSDK();

sdk.on('progress:start', ({ id, message, total }) => {
  console.log(`[${id}] ${message}${total ? ` (0/${total})` : ''}`);
});

sdk.on('progress:update', ({ id, message, current }) => {
  console.log(`[${id}] ${message}${current !== undefined ? ` (${current})` : ''}`);
});

sdk.on('progress:complete', ({ id, message }) => {
  console.log(`[${id}] Done: ${message}`);
});
```

Example output:

```
[fetch-cognitives] Fetching cognitives from owner/repo (0/3)
[fetch-cognitives] Fetching cognitives from owner/repo (1)
[fetch-cognitives] Fetching cognitives from owner/repo (2)
[fetch-cognitives] Fetching cognitives from owner/repo (3)
[fetch-cognitives] Done: Fetched 3 cognitives
```

### Operation Logging

Log the start, completion, and failure of every SDK operation:

```typescript
sdk.on('operation:start', ({ operation }) => {
  console.log(`Starting ${operation}...`);
});

sdk.on('operation:complete', ({ operation, durationMs }) => {
  console.log(`${operation} completed in ${durationMs}ms`);
});

sdk.on('operation:error', ({ operation, error }) => {
  console.error(`${operation} failed:`, error.message);
});
```

### Installation Monitoring

Track each cognitive installation in detail:

```typescript
sdk.on('install:start', ({ cognitive, agent, mode }) => {
  console.log(`Installing ${cognitive} for ${agent} (mode: ${mode})`);
});

sdk.on('install:symlink', ({ source, target }) => {
  console.debug(`  Symlink: ${source} -> ${target}`);
});

sdk.on('install:copy', ({ source, target }) => {
  console.debug(`  Copy: ${source} -> ${target}`);
});

sdk.on('install:complete', ({ cognitive, agent, result }) => {
  if (result.success) {
    console.log(`  Installed ${cognitive} for ${agent} at ${result.path}`);
  } else {
    console.error(`  Failed to install ${cognitive} for ${agent}: ${result.error}`);
  }
});
```

### Debugging

Use events for troubleshooting provider resolution, git operations, and lock file issues:

```typescript
// Provider debugging
sdk.on('provider:fetch:start', ({ providerId, url }) => {
  console.debug(`[provider] ${providerId} fetching ${url}`);
});

sdk.on('provider:fetch:complete', ({ providerId, url, found }) => {
  console.debug(`[provider] ${providerId} ${url}: ${found ? 'found' : 'not found'}`);
});

sdk.on('provider:fetch:error', ({ providerId, url, error }) => {
  console.debug(`[provider] ${providerId} ${url} error: ${error}`);
});

// Git debugging
sdk.on('git:clone:start', ({ url }) => {
  console.debug(`[git] Cloning ${url}...`);
});

sdk.on('git:clone:complete', ({ url, path, durationMs }) => {
  console.debug(`[git] Cloned ${url} to ${path} in ${durationMs}ms`);
});

sdk.on('git:clone:error', ({ url, error }) => {
  console.debug(`[git] Clone failed for ${url}: ${error}`);
});

// Lock file debugging
sdk.on('lock:migrate', ({ fromVersion, toVersion }) => {
  console.warn(`Lock file migrated from v${fromVersion} to v${toVersion}`);
});

sdk.on('lock:write', ({ path, entryCount }) => {
  console.debug(`Lock file written to ${path} with ${entryCount} entries`);
});
```

### Agent Detection

Monitor which agents are detected in the current environment:

```typescript
sdk.on('agent:detect:start', () => {
  console.log('Detecting installed agents...');
});

sdk.on('agent:detect:found', ({ agent, displayName }) => {
  console.log(`  Found: ${displayName} (${agent})`);
});

sdk.on('agent:detect:complete', ({ results, durationMs }) => {
  const detected = results.filter((r) => r.detected);
  console.log(`Detected ${detected.length} agent(s) in ${durationMs}ms`);
});
```

### Unsubscribing

Every `on` and `once` call returns an `Unsubscribe` function. Call it to remove the handler:

```typescript
const unsubscribe = sdk.on('operation:start', ({ operation }) => {
  console.log(`Starting ${operation}`);
});

// Later, when you no longer need the handler:
unsubscribe();
```

With `once`, the handler is automatically removed after the first invocation, but you can also unsubscribe before the event fires:

```typescript
const unsub = sdk.once('sdk:initialized', (payload) => {
  console.log('SDK initialized');
});

// Cancel if you no longer want to wait
unsub();
```

---

## See Also

- [API Reference](./api-reference.md) — SDK methods that emit events
- [Type System](./type-system.md) — `CognitError`, `AgentType`, `InstallMode`, `InstallResult`, and other types referenced in event payloads
