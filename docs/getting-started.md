# Getting Started

This guide walks you through installing the SDK, creating an instance, configuring it, and running your first operations.

## Prerequisites

- **Node.js 20+** — The SDK requires Node.js version 20 or later.
- **pnpm** (recommended) or npm/yarn as your package manager.

## Installation

```bash
# pnpm (recommended)
pnpm add @synapsync/agent-sync-sdk

# npm
npm install @synapsync/agent-sync-sdk

# yarn
yarn add @synapsync/agent-sync-sdk
```

## Creating an SDK Instance

The SDK is created through the `createAgentSyncSDK` factory function. It accepts an optional partial configuration object that is merged with sensible defaults.

### Default Configuration

```typescript
import { createAgentSyncSDK } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK();
```

With no arguments, the SDK uses the current working directory, default agent definitions, the built-in file system adapter, and auto-detected environment variables.

### Custom Configuration

```typescript
import { createAgentSyncSDK } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK({
  cwd: '/path/to/project',
  agentsDir: '.agents',
  lockFileName: '.cognit-lock.json',
  git: {
    cloneTimeoutMs: 30_000,
    depth: 1,
  },
  providers: {
    githubToken: process.env.GITHUB_TOKEN,
    custom: [],
  },
  telemetry: {
    enabled: true,
  },
});
```

## Configuration Options

The `SDKConfig` interface defines every configurable aspect of the SDK.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentsDir` | `string` | `'.agents'` | Root directory for canonical cognitive storage. All cognitives are stored here before being linked or copied into individual agent directories. |
| `lockFileName` | `string` | `'.cognit-lock.json'` | Name of the lock file that records installed cognitives for reproducible installations. |
| `cwd` | `string` | `process.cwd()` | Current working directory. All relative paths are resolved against this. |
| `homeDir` | `string` | `os.homedir()` | Home directory used for global-scope installations. |
| `fs` | `FileSystemAdapter` | `NodeFileSystem` | File system implementation. Override this for testing or custom environments. |
| `git.cloneTimeoutMs` | `number` | `30000` | Timeout in milliseconds for git clone operations. |
| `git.depth` | `number` | `1` | Git clone depth. A depth of 1 performs a shallow clone for faster downloads. |
| `providers.githubToken` | `string \| undefined` | Auto-detected | GitHub personal access token. Auto-detected from the `GITHUB_TOKEN` or `GH_TOKEN` environment variables if not provided. |
| `providers.custom` | `HostProvider[]` | `[]` | Custom source providers. These are registered first and take highest priority during source resolution. |
| `agents.definitionsPath` | `string \| undefined` | `undefined` | Path to a custom agent definitions YAML file. Use this to override or extend the built-in agent registry. |
| `agents.additional` | `AgentConfig[]` | `[]` | Additional agent configurations registered at startup alongside the built-in 39 agents. |
| `telemetry.enabled` | `boolean` | `true` | Whether to enable anonymous usage telemetry. |
| `telemetry.endpoint` | `string \| undefined` | `undefined` | Custom endpoint URL for telemetry data. |

## First Operations

Once you have an SDK instance, you can start managing cognitives immediately.

### 1. Initialize a New Cognitive

Create a new cognitive scaffold in the current directory:

```typescript
import { createAgentSyncSDK, isOk } from '@synapsync/agent-sync-sdk';

const sdk = createAgentSyncSDK();

const result = await sdk.init('my-skill', 'skill', {
  description: 'My custom skill for code review',
});

if (isOk(result)) {
  console.log(`Created at: ${result.value.path}`);
  console.log(`Files: ${result.value.files.join(', ')}`);
}
```

### 2. Add from a Local Directory

Install cognitives from a local path into specific agents:

```typescript
const result = await sdk.add('./path/to/cognitives', {
  agents: ['claude-code'],
  confirmed: true,
});

if (isOk(result)) {
  console.log(result.value.message);
  for (const item of result.value.installed) {
    console.log(`  Installed: ${item.name}`);
  }
}
```

### 3. Add from GitHub

Install cognitives directly from a GitHub repository:

```typescript
const result = await sdk.add('owner/repo', {
  agents: ['cursor', 'windsurf'],
  confirmed: true,
});

if (isOk(result)) {
  console.log(`Installed ${result.value.installed.length} cognitives`);
}
```

### 4. List Installed Cognitives

See everything currently installed:

```typescript
const result = await sdk.list();

if (isOk(result)) {
  console.log(`Total: ${result.value.count} cognitives`);
  for (const c of result.value.cognitives) {
    console.log(`  ${c.name} (${c.cognitiveType}) — ${c.source}`);
  }
}
```

### 5. Remove Cognitives

Remove one or more cognitives by name:

```typescript
const result = await sdk.remove(['my-skill'], {
  confirmed: true,
});

if (isOk(result)) {
  console.log(result.value.message);
}
```

### 6. Check Installation Health

Verify that all installed cognitives are intact and consistent:

```typescript
const result = await sdk.check();

if (isOk(result)) {
  console.log(`Healthy: ${result.value.healthy.length}`);
  console.log(`Issues: ${result.value.issues.length}`);

  for (const issue of result.value.issues) {
    console.log(`  [${issue.severity}] ${issue.type}: ${issue.message}`);
  }
}
```

## Complete Working Example

The following example demonstrates a full workflow: creating an SDK instance, adding cognitives from GitHub, listing what was installed, finding available cognitives, checking health, and cleaning up.

```typescript
import { createAgentSyncSDK, isOk, isErr } from '@synapsync/agent-sync-sdk';

async function main() {
  // Create the SDK with default config
  const sdk = createAgentSyncSDK();

  // Subscribe to events for visibility
  sdk.on('add:start', (payload) => {
    console.log(`Adding from ${payload.source}...`);
  });
  sdk.on('add:complete', (payload) => {
    console.log(`Add complete: ${payload.message}`);
  });

  try {
    // 1. Add cognitives from a GitHub repository
    const addResult = await sdk.add('synapsync/starter-cognitives', {
      agents: ['claude-code', 'cursor', 'windsurf'],
      confirmed: true,
    });

    if (isErr(addResult)) {
      console.error(`Add failed: ${addResult.error.message}`);
      return;
    }

    console.log(`Installed ${addResult.value.installed.length} cognitives`);
    for (const item of addResult.value.installed) {
      console.log(`  - ${item.name} (${item.cognitiveType})`);
    }

    // 2. List everything installed
    const listResult = await sdk.list();

    if (isOk(listResult)) {
      console.log(`\nTotal installed: ${listResult.value.count}`);
      for (const c of listResult.value.cognitives) {
        console.log(`  ${c.name} [${c.cognitiveType}] from ${c.source}`);
      }
    }

    // 3. Find available cognitives in a repository
    const findResult = await sdk.find('synapsync/community-cognitives', {
      cognitiveType: 'skill',
    });

    if (isOk(findResult)) {
      console.log(`\nFound ${findResult.value.total} skills available`);
      for (const r of findResult.value.results) {
        console.log(`  ${r.name}: ${r.description}`);
      }
    }

    // 4. Check installation health
    const checkResult = await sdk.check();

    if (isOk(checkResult)) {
      const { healthy, issues } = checkResult.value;
      console.log(`\nHealth: ${healthy.length} healthy, ${issues.length} issues`);

      if (issues.length > 0) {
        for (const issue of issues) {
          console.log(`  [${issue.severity}] ${issue.type}: ${issue.message}`);
        }
      }
    }
  } finally {
    // 5. Always dispose to clean up resources
    await sdk.dispose();
  }
}

main().catch(console.error);
```

## Next Steps

- [API Reference](./api-reference.md) — Full method signatures, options, and return types
- [Type System](./type-system.md) — Understanding `Result<T, E>`, branded types, and type guards
- [Providers](./providers.md) — Configuring and creating source providers
- [Events](./events.md) — Subscribing to SDK events for logging and UI integration
- [Errors](./errors.md) — Error taxonomy and handling patterns
