# Sprint 7: Public API & Extended Providers

**Duration:** 5 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1 (types, errors), Sprint 2 (config, events, FS), Sprint 3 (discovery, sources), Sprint 4 (providers), Sprint 5 (installer, lock), Sprint 6 (operations)
**Layer:** 6 (Public API) + Layer 3 additions (providers)

---

## Sprint Goal

Build the **composition root** that wires all SDK modules into a single factory function (`createAgentSyncSDK`), define the **public API surface** exported from `src/index.ts`, and implement **4 additional providers** (Mintlify, HuggingFace, WellKnown, Direct URL) to complete the provider system.

After this sprint, consumers can `import { createAgentSyncSDK } from '@synapsync/agent-sync-sdk'` and use the full SDK.

---

## Phase 7.1: Composition Root (2 days)

### Task 7.1.1: SDK Factory Function

**File:** `src/sdk.ts`

The composition root is the ONLY place where concrete implementations are instantiated and wired together. No other module creates its own dependencies.

- [ ] Implement `createAgentSyncSDK(options?: Partial<SDKConfig>)` factory function
- [ ] Wire Layer 1: `resolveConfig(options)` -> `SDKConfig`, `new EventBusImpl()` -> `EventBus`
- [ ] Wire Layer 2: `new AgentRegistryImpl(config, eventBus)`, `new AgentDetectorImpl(agentRegistry, config.fs)`
- [ ] Wire Layer 3: `new SourceParserImpl()`, `new GitClientImpl(config, eventBus)`, `new ProviderRegistryImpl(eventBus)`, register default providers, `new DiscoveryServiceImpl(config.fs, eventBus)`
- [ ] Wire Layer 4: `new FileOperationsImpl(config.fs)`, `new LockFileManagerImpl(config, fileOps, eventBus)`, `new InstallerImpl(agentRegistry, fileOps, eventBus)`
- [ ] Wire Layer 5: Instantiate all 8 operations with `OperationContext`
- [ ] Return `AgentSyncSDKImpl` facade
- [ ] Emit `sdk:initialized` event after wiring is complete

```typescript
// src/sdk.ts
import type { AgentSyncSDK, SDKConfig } from './types/index.js';
import { resolveConfig } from './config/index.js';
import { EventBusImpl } from './events/index.js';
import { AgentRegistryImpl } from './agents/registry.js';
import { AgentDetectorImpl } from './agents/detector.js';
import { SourceParserImpl } from './source/parser.js';
import { GitClientImpl } from './source/git.js';
import { ProviderRegistryImpl, registerDefaultProviders } from './providers/index.js';
import { DiscoveryServiceImpl } from './discovery/index.js';
import { FileOperationsImpl } from './installer/file-ops.js';
import { LockFileManagerImpl } from './lock/manager.js';
import { InstallerImpl } from './installer/service.js';
import { AddOperation } from './operations/add.js';
import { RemoveOperation } from './operations/remove.js';
import { ListOperation } from './operations/list.js';
import { FindOperation } from './operations/find.js';
import { UpdateOperation } from './operations/update.js';
import { SyncOperation } from './operations/sync.js';
import { CheckOperation } from './operations/check.js';
import { InitOperation } from './operations/init.js';
import type { OperationContext } from './operations/context.js';

export function createAgentSyncSDK(userConfig?: Partial<SDKConfig>): AgentSyncSDK {
  // Layer 1: Config & Events
  const config = resolveConfig(userConfig);
  const eventBus = new EventBusImpl();

  // Layer 2: Agents
  const agentRegistry = new AgentRegistryImpl(config, eventBus);
  const agentDetector = new AgentDetectorImpl(agentRegistry, config.fs);

  // Layer 3: Discovery & Providers
  const sourceParser = new SourceParserImpl();
  const gitClient = new GitClientImpl(config, eventBus);
  const providerRegistry = new ProviderRegistryImpl(eventBus);
  registerDefaultProviders(providerRegistry, config);
  const discoveryService = new DiscoveryServiceImpl(config.fs, eventBus);

  // Layer 4: Installer & Lock
  const fileOps = new FileOperationsImpl(config.fs);
  const lockManager = new LockFileManagerImpl(config, fileOps, eventBus);
  const installer = new InstallerImpl(agentRegistry, fileOps, eventBus);

  // Layer 5: Operations
  const ctx: OperationContext = {
    agentRegistry,
    agentDetector,
    providerRegistry,
    sourceParser,
    gitClient,
    discoveryService,
    installer,
    lockManager,
    eventBus,
    config,
  };

  const addOp = new AddOperation(ctx);
  const removeOp = new RemoveOperation(ctx);
  const listOp = new ListOperation(ctx);
  const findOp = new FindOperation(ctx);
  const updateOp = new UpdateOperation(ctx);
  const syncOp = new SyncOperation(ctx);
  const checkOp = new CheckOperation(ctx);
  const initOp = new InitOperation(ctx);

  // Emit initialization event
  eventBus.emit('sdk:initialized', { configHash: '' });

  // Layer 6: SDK Facade
  return new AgentSyncSDKImpl(
    config,
    eventBus,
    { add: addOp, remove: removeOp, list: listOp, find: findOp, update: updateOp, sync: syncOp, check: checkOp, init: initOp },
    agentRegistry,
    providerRegistry,
  );
}
```

### Task 7.1.2: SDK Facade Implementation

**File:** `src/sdk.ts` (continued)

- [ ] Implement `AgentSyncSDKImpl` class implementing `AgentSyncSDK` interface
- [ ] Expose typed operation methods that delegate to operation classes
- [ ] Expose `events` (EventBus), `config` (readonly), `agents` (AgentRegistry), `providers` (ProviderRegistry)
- [ ] Implement `on()` and `once()` event subscription methods that delegate to EventBus
- [ ] Implement `dispose()` for cleanup (cancel in-flight operations)

```typescript
// src/sdk.ts (AgentSyncSDK interface and implementation)

export interface AgentSyncSDK {
  // -- Operations --
  add(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>>;
  remove(ref: CognitiveRef, options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>>;
  list(filter?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>>;
  find(source: string, filter?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>>;
  update(filter?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>>;
  sync(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>>;
  check(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>>;
  init(name: string, type: CognitiveType, options?: Partial<InitOptions>): Promise<Result<InitResult, CognitError>>;

  // -- Accessors --
  readonly events: EventBus;
  readonly config: Readonly<SDKConfig>;
  readonly agents: AgentRegistry;
  readonly providers: ProviderRegistry;

  // -- Event Subscription (convenience) --
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;

  // -- Lifecycle --
  dispose(): Promise<void>;
}

class AgentSyncSDKImpl implements AgentSyncSDK {
  constructor(
    readonly config: Readonly<SDKConfig>,
    readonly events: EventBus,
    private readonly ops: {
      add: AddOperation;
      remove: RemoveOperation;
      list: ListOperation;
      find: FindOperation;
      update: UpdateOperation;
      sync: SyncOperation;
      check: CheckOperation;
      init: InitOperation;
    },
    readonly agents: AgentRegistry,
    readonly providers: ProviderRegistry,
  ) {}

  async add(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>> {
    return this.ops.add.execute(source, options);
  }

  async remove(ref: CognitiveRef, options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>> {
    return this.ops.remove.execute(ref, options);
  }

  async list(filter?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>> {
    return this.ops.list.execute(filter);
  }

  async find(source: string, filter?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>> {
    return this.ops.find.execute(source, filter);
  }

  async update(filter?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>> {
    return this.ops.update.execute(filter);
  }

  async sync(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>> {
    return this.ops.sync.execute(options);
  }

  async check(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>> {
    return this.ops.check.execute(options);
  }

  async init(name: string, type: CognitiveType, options?: Partial<InitOptions>): Promise<Result<InitResult, CognitError>> {
    return this.ops.init.execute(name, type, options);
  }

  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe {
    return this.events.on(event, handler);
  }

  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe {
    return this.events.once(event, handler);
  }

  async dispose(): Promise<void> {
    // Cancel in-flight operations, clean up resources
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 7.2: Public Exports (0.5 days)

### Task 7.2.1: Main Entry Point

**File:** `src/index.ts`

- [ ] Export `createAgentSyncSDK` as the primary entry point
- [ ] Export `AgentSyncSDK` type for consumers to type their SDK instances
- [ ] Export all types from `src/types/` (cognitive, agent, provider, installer, lock, operations, config, events, result, branded, category)
- [ ] Export all error classes from `src/errors/` (for consumers to catch/match)
- [ ] Export key interfaces: `HostProvider`, `FileSystemAdapter`, `AgentRegistry`, `ProviderRegistry`
- [ ] Do NOT export internal implementations (`InstallerImpl`, `LockFileManagerImpl`, etc.)

```typescript
// src/index.ts

// -- Main entry point --
export { createAgentSyncSDK } from './sdk.js';
export type { AgentSyncSDK } from './sdk.js';

// -- Types (for consumers) --
export type {
  // Cognitive types
  Cognitive, CognitiveType, CognitiveRef, Skill, Prompt, Rule, AgentCognitive,
  RemoteCognitive, WellKnownCognitive,
  // Agent types
  AgentConfig, AgentType, AgentDirConfig, AgentDetectionResult,
  AgentRegistry,
  // Provider types
  HostProvider, ProviderMatch, ProviderRegistry,
  SourceDescriptor, SourceParser,
  // Installer types
  InstallMode, InstallScope, InstallTarget, InstallResult,
  // Lock types
  LockFile, LockEntry,
  // Operation types
  AddOptions, AddResult,
  ListOptions, ListResult,
  RemoveOptions, RemoveResult,
  UpdateOptions, UpdateResult,
  SyncOptions, SyncResult,
  CheckOptions, CheckResult,
  FindOptions, FindResult,
  InitOptions, InitResult,
  // Config types
  SDKConfig, FileSystemAdapter,
  // Event types
  SDKEventMap, Unsubscribe,
  // Result type
  Result,
  // Branded types
  AgentName, CognitiveName, SafeName, SourceIdentifier,
  // Category types
  Category, CategoryMapping,
} from './types/index.js';

// -- Errors (for consumers to catch) --
export {
  CognitError,
  ProviderError, ProviderFetchError, ProviderMatchError,
  InstallError, PathTraversalError, SymlinkError,
  DiscoveryError, ParseError,
  LockError, LockReadError, LockWriteError,
  ConfigError, InvalidConfigError,
  SourceError, SourceParseError, GitCloneError,
  AgentError, AgentNotFoundError,
} from './errors/index.js';
```

### Task 7.2.2: Package Configuration

**File:** `package.json` (verify/update exports field)

- [ ] Verify `"type": "module"` is set
- [ ] Verify `"exports"` field: `{ ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
- [ ] Verify `"types": "./dist/index.d.ts"`
- [ ] Verify `"files": ["dist"]`
- [ ] Verify `"engines": { "node": ">=20" }`

```jsonc
// package.json (relevant fields)
{
  "name": "@synapsync/agent-sync-sdk",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "engines": {
    "node": ">=20"
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
pnpm build  # tsup build to dist/
```

---

## Phase 7.3: Additional Providers (2 days)

### Task 7.3.1: Mintlify Provider

**File:** `src/providers/mintlify.ts`

Mintlify documentation sites serve cognitives at well-known paths. The provider fetches content from Mintlify-powered docs.

- [ ] Implement `MintlifyProvider` implementing `HostProvider` interface
- [ ] `id: 'mintlify'`, `displayName: 'Mintlify'`
- [ ] `match()`: detect Mintlify URLs by domain patterns or `mintlify-proj` frontmatter indicator
- [ ] `toRawUrl()`: Mintlify URLs are already raw content (no blob/tree conversion needed)
- [ ] `getSourceIdentifier()`: `mintlify/{domain}` (e.g., `mintlify/bun.sh`)
- [ ] `fetchCognitive()`: HTTP GET to URL, parse markdown + frontmatter
- [ ] `fetchAll()`: not applicable for single-URL Mintlify sources; return single-element array
- [ ] Validate that fetched content has valid YAML frontmatter with `name` and `description`

```typescript
// src/providers/mintlify.ts
export class MintlifyProvider implements HostProvider {
  readonly id = 'mintlify';
  readonly displayName = 'Mintlify';

  match(source: string): ProviderMatch {
    // Match mintlify-style documentation URLs
    // e.g., https://docs.example.com/docs/SKILL.md
    try {
      const url = new URL(source);
      const isMintlify = url.pathname.endsWith('.md') &&
        !url.hostname.includes('github.com') &&
        !url.hostname.includes('gitlab.com') &&
        !url.hostname.includes('huggingface.co');
      return { matches: isMintlify, sourceIdentifier: isMintlify ? `mintlify/${url.hostname}` : undefined };
    } catch {
      return { matches: false };
    }
  }

  toRawUrl(url: string): string {
    return url; // Mintlify URLs serve raw markdown directly
  }

  getSourceIdentifier(source: string): string {
    try {
      const url = new URL(source);
      return `mintlify/${url.hostname}`;
    } catch {
      return `mintlify/${source}`;
    }
  }

  async fetchCognitive(source: string): Promise<RemoteCognitive | null> {
    // HTTP fetch, parse frontmatter, validate, return RemoteCognitive
    // ...
  }

  async fetchAll(source: string): Promise<RemoteCognitive[]> {
    const cognitive = await this.fetchCognitive(source);
    return cognitive ? [cognitive] : [];
  }
}
```

### Task 7.3.2: HuggingFace Provider

**File:** `src/providers/huggingface.ts`

HuggingFace Spaces host cognitive files. The provider converts blob URLs to raw URLs.

- [ ] Implement `HuggingFaceProvider` implementing `HostProvider` interface
- [ ] `id: 'huggingface'`, `displayName: 'HuggingFace'`
- [ ] `match()`: detect `huggingface.co` URLs
- [ ] `toRawUrl()`: convert blob URLs to raw URLs (`/blob/main/` -> `/resolve/main/`)
- [ ] `getSourceIdentifier()`: `huggingface/{owner}/{repo}` format
- [ ] `fetchCognitive()`: HTTP GET to raw URL, parse markdown + frontmatter
- [ ] `fetchAll()`: fetch repository tree, discover cognitive files

```typescript
// src/providers/huggingface.ts
export class HuggingFaceProvider implements HostProvider {
  readonly id = 'huggingface';
  readonly displayName = 'HuggingFace';

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      return { matches: url.hostname === 'huggingface.co' };
    } catch {
      return { matches: false };
    }
  }

  toRawUrl(url: string): string {
    // Convert: https://huggingface.co/spaces/owner/repo/blob/main/SKILL.md
    // To:      https://huggingface.co/spaces/owner/repo/resolve/main/SKILL.md
    return url.replace('/blob/', '/resolve/');
  }

  getSourceIdentifier(source: string): string {
    try {
      const url = new URL(source);
      const parts = url.pathname.split('/').filter(Boolean);
      // /spaces/owner/repo -> huggingface/owner/repo
      if (parts[0] === 'spaces' && parts.length >= 3) {
        return `huggingface/${parts[1]}/${parts[2]}`;
      }
      return `huggingface/${parts.join('/')}`;
    } catch {
      return `huggingface/${source}`;
    }
  }

  async fetchCognitive(source: string): Promise<RemoteCognitive | null> {
    // HTTP fetch raw URL, parse, validate
    // ...
  }

  async fetchAll(source: string): Promise<RemoteCognitive[]> {
    // Fetch tree, discover cognitive files
    // ...
  }
}
```

### Task 7.3.3: WellKnown Provider

**File:** `src/providers/wellknown.ts`

Implements RFC 8615 well-known URL discovery for cognitive endpoints at `/.well-known/cognitives/index.json`.

- [ ] Implement `WellKnownProvider` implementing `HostProvider` interface
- [ ] `id: 'wellknown'`, `displayName: 'Well-Known Endpoint'`
- [ ] `match()`: detect HTTPS URLs that are not GitHub, GitLab, HuggingFace, or Mintlify (catch-all for domains)
- [ ] `toRawUrl()`: no conversion needed
- [ ] `getSourceIdentifier()`: `wellknown/{domain}` format
- [ ] `fetchAll()`: HTTP GET to `{origin}/.well-known/cognitives/index.json`, parse index, fetch each listed cognitive
- [ ] Legacy fallback: also check `/.well-known/skills/` path for backward compatibility
- [ ] Index format: `{ cognitives: [{ name, type, url, description }] }`

```typescript
// src/providers/wellknown.ts
export class WellKnownProvider implements HostProvider {
  readonly id = 'wellknown';
  readonly displayName = 'Well-Known Endpoint';

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      const isKnownProvider = ['github.com', 'gitlab.com', 'huggingface.co'].some(d => url.hostname.includes(d));
      return {
        matches: url.protocol === 'https:' && !isKnownProvider && !url.pathname.endsWith('.md'),
      };
    } catch {
      return { matches: false };
    }
  }

  getSourceIdentifier(source: string): string {
    try {
      return `wellknown/${new URL(source).hostname}`;
    } catch {
      return `wellknown/${source}`;
    }
  }

  async fetchAll(source: string): Promise<RemoteCognitive[]> {
    const url = new URL(source);
    const indexUrl = `${url.origin}/.well-known/cognitives/index.json`;

    try {
      const response = await fetch(indexUrl);
      if (!response.ok) {
        // Legacy fallback
        const legacyUrl = `${url.origin}/.well-known/skills/index.json`;
        const legacyResponse = await fetch(legacyUrl);
        if (!legacyResponse.ok) return [];
        const legacyIndex = await legacyResponse.json();
        return this.parseIndex(legacyIndex, url.origin);
      }
      const index = await response.json();
      return this.parseIndex(index, url.origin);
    } catch {
      return [];
    }
  }

  private parseIndex(index: unknown, origin: string): RemoteCognitive[] {
    // Parse { cognitives: [{ name, type, url, description }] }
    // ...
    return [];
  }
}
```

### Task 7.3.4: Direct URL Provider

**File:** `src/providers/direct.ts`

Catch-all provider for arbitrary HTTPS URLs pointing directly to a cognitive file.

- [ ] Implement `DirectProvider` implementing `HostProvider` interface
- [ ] `id: 'direct'`, `displayName: 'Direct URL'`
- [ ] `match()`: matches any HTTPS URL ending in `.md` that was not caught by other providers
- [ ] `toRawUrl()`: return URL as-is
- [ ] `getSourceIdentifier()`: `direct/{hostname}/{path}` format
- [ ] `fetchCognitive()`: HTTP GET, parse markdown + frontmatter, validate
- [ ] `fetchAll()`: delegates to `fetchCognitive()` (single-file source)

```typescript
// src/providers/direct.ts
export class DirectProvider implements HostProvider {
  readonly id = 'direct';
  readonly displayName = 'Direct URL';

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      return {
        matches: url.protocol === 'https:' && url.pathname.endsWith('.md'),
      };
    } catch {
      return { matches: false };
    }
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    try {
      const url = new URL(source);
      return `direct/${url.hostname}${url.pathname}`;
    } catch {
      return `direct/${source}`;
    }
  }

  async fetchCognitive(source: string): Promise<RemoteCognitive | null> {
    try {
      const response = await fetch(source);
      if (!response.ok) return null;
      const content = await response.text();
      // Parse frontmatter, validate, return RemoteCognitive
      // ...
      return null; // Placeholder
    } catch {
      return null;
    }
  }

  async fetchAll(source: string): Promise<RemoteCognitive[]> {
    const cognitive = await this.fetchCognitive(source);
    return cognitive ? [cognitive] : [];
  }
}
```

### Task 7.3.5: Register Default Providers

**File:** `src/providers/index.ts` (update)

- [ ] Update `registerDefaultProviders()` to register all 6 providers in priority order:
  1. `GitHubProvider` (Sprint 4)
  2. `LocalProvider` (Sprint 4)
  3. `MintlifyProvider` (new)
  4. `HuggingFaceProvider` (new)
  5. `WellKnownProvider` (new)
  6. `DirectProvider` (new -- lowest priority, catch-all)
- [ ] First-match-wins priority: more specific providers registered first

```typescript
// src/providers/index.ts
export function registerDefaultProviders(registry: ProviderRegistryImpl, config: SDKConfig): void {
  registry.register(new GitHubProvider(config));
  registry.register(new LocalProvider(config));
  registry.register(new MintlifyProvider());
  registry.register(new HuggingFaceProvider());
  registry.register(new WellKnownProvider());
  registry.register(new DirectProvider()); // Lowest priority
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 7.4: Tests (0.5 days)

### Task 7.4.1: SDK Integration Test

**File:** `tests/sdk.test.ts`

- [ ] Test `createAgentSyncSDK()` with no args -- returns valid SDK instance
- [ ] Test `createAgentSyncSDK({ cwd, fs, telemetry: { enabled: false } })` -- custom config
- [ ] Test SDK facade: `sdk.add()`, `sdk.list()`, `sdk.remove()` delegate correctly
- [ ] Test event subscription: `sdk.on('operation:start', handler)` fires for operations
- [ ] Test `sdk.agents` returns populated `AgentRegistry` (39+ agents)
- [ ] Test `sdk.config` returns resolved config
- [ ] Test `sdk.dispose()` completes without error
- [ ] Full round-trip: create SDK with in-memory FS, add a local cognitive, list it, remove it

```typescript
// tests/sdk.test.ts
describe('createAgentSyncSDK', () => {
  it('creates a fully wired SDK instance', () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    expect(sdk.config.cwd).toBe('/project');
    expect(sdk.agents.getAll().size).toBeGreaterThan(35);
    expect(sdk.events).toBeDefined();
  });

  it('round-trips add -> list -> remove', async () => {
    const fs = createMemoryFs({
      '/source/skills/test-skill/SKILL.md': '---\nname: Test\ndescription: A test\n---\nContent',
    });
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    // Add
    const addResult = await sdk.add('/source', {
      agents: ['claude-code' as AgentType],
      confirmed: true,
    });
    expect(addResult.ok).toBe(true);

    // List
    const listResult = await sdk.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value.count).toBeGreaterThan(0);
    }

    // Remove
    const removeResult = await sdk.remove('test-skill');
    expect(removeResult.ok).toBe(true);
  });
});
```

### Task 7.4.2: Additional Provider Tests

**File:** `tests/providers/additional.test.ts`

- [ ] `MintlifyProvider`: match/no-match URLs, `toRawUrl`, `getSourceIdentifier`
- [ ] `HuggingFaceProvider`: match HuggingFace URLs, blob-to-raw conversion, source identifier
- [ ] `WellKnownProvider`: match generic HTTPS, exclude known providers, well-known path construction
- [ ] `DirectProvider`: match `.md` URLs, catch-all behavior, source identifier
- [ ] Provider priority: verify GitHub matches before WellKnown for `github.com` URLs

```typescript
// tests/providers/additional.test.ts
describe('MintlifyProvider', () => {
  const provider = new MintlifyProvider();

  it('matches documentation site URLs ending in .md', () => {
    expect(provider.match('https://docs.bun.sh/docs/SKILL.md').matches).toBe(true);
  });

  it('does not match GitHub URLs', () => {
    expect(provider.match('https://github.com/o/r/blob/main/SKILL.md').matches).toBe(false);
  });
});

describe('HuggingFaceProvider', () => {
  const provider = new HuggingFaceProvider();

  it('matches huggingface.co URLs', () => {
    expect(provider.match('https://huggingface.co/spaces/owner/repo').matches).toBe(true);
  });

  it('converts blob URLs to resolve URLs', () => {
    expect(provider.toRawUrl('https://huggingface.co/spaces/o/r/blob/main/SKILL.md'))
      .toBe('https://huggingface.co/spaces/o/r/resolve/main/SKILL.md');
  });
});

describe('WellKnownProvider', () => {
  const provider = new WellKnownProvider();

  it('matches generic HTTPS domains', () => {
    expect(provider.match('https://example.com').matches).toBe(true);
  });

  it('does not match github.com', () => {
    expect(provider.match('https://github.com/o/r').matches).toBe(false);
  });
});

describe('DirectProvider', () => {
  const provider = new DirectProvider();

  it('matches .md URLs', () => {
    expect(provider.match('https://example.com/path/SKILL.md').matches).toBe(true);
  });

  it('does not match non-.md URLs', () => {
    expect(provider.match('https://example.com/page').matches).toBe(false);
  });
});
```

**Verification:**
```bash
pnpm vitest run tests/sdk.test.ts tests/providers/additional.test.ts
pnpm tsc --noEmit
pnpm build
```

---

## Definition of Done

- [ ] `createAgentSyncSDK()` factory function wires all 6 layers of the architecture
- [ ] `AgentSyncSDK` facade exposes all 8 operations: `add`, `remove`, `list`, `find`, `update`, `sync`, `check`, `init`
- [ ] `AgentSyncSDK` exposes accessors: `events`, `config`, `agents`, `providers`
- [ ] `AgentSyncSDK` exposes convenience `on()` and `once()` for event subscription
- [ ] `src/index.ts` exports `createAgentSyncSDK`, all public types, all error classes, key interfaces
- [ ] `src/index.ts` does NOT export internal implementations
- [ ] `package.json` exports field correctly maps `"."` to `./dist/index.js` and `./dist/index.d.ts`
- [ ] `MintlifyProvider` implements `HostProvider` for Mintlify documentation sites
- [ ] `HuggingFaceProvider` implements `HostProvider` for HuggingFace Spaces with blob-to-raw conversion
- [ ] `WellKnownProvider` implements `HostProvider` for RFC 8615 well-known endpoints with legacy fallback
- [ ] `DirectProvider` implements `HostProvider` as catch-all for arbitrary HTTPS `.md` URLs
- [ ] All 6 providers registered in `registerDefaultProviders()` in correct priority order
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm build` produces `dist/index.js` and `dist/index.d.ts`
- [ ] `pnpm vitest run tests/sdk.test.ts tests/providers/additional.test.ts` passes

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Composition root wiring errors** | SDK instantiation fails silently or with cryptic errors | Medium | Integration test verifies full round-trip (create -> add -> list -> remove). Constructor injection makes missing deps immediately visible. |
| **Circular import at composition root** | ESM import cycle causes undefined modules at runtime | Low | Strict layer imports enforced by ESLint `no-restricted-imports`. Composition root only imports from each layer -- never between same-layer modules. |
| **Public API surface too large** | Breaking changes in future versions affect many consumers | Medium | Only export types and factory function. Internal implementations hidden. Minimal `index.ts` surface. |
| **Provider priority conflicts** | WellKnown provider matches URLs meant for other providers | Medium | Register specific providers (GitHub, Mintlify, HuggingFace) before catch-all (WellKnown, Direct). First-match-wins. Unit tests verify non-overlap. |
| **HTTP fetch failures in providers** | Network errors during Mintlify/HuggingFace/WellKnown fetch | Medium | All providers return `null` or empty array on failure. No thrown exceptions. `Result<T,E>` pattern at operation level. |
| **Build output structure** | tsup output not matching `exports` field in package.json | Low | Verify `dist/index.js` and `dist/index.d.ts` exist after build. Test import in a separate project. |

---

## Rollback Strategy

If Sprint 7 cannot be completed:

1. **Public API rollback:** `src/sdk.ts` and `src/index.ts` are the only new files. Removing them leaves all internal modules functional -- they just lack a public entry point. Consumers can still import individual modules directly.

2. **Provider rollback:** Additional providers (Mintlify, HuggingFace, WellKnown, Direct) are independent files in `src/providers/`. Removing any one does not affect the others. GitHub and Local providers from Sprint 4 remain functional.

3. **Minimal viable delivery:** If time runs short, deliver the composition root + public exports first (Phase 7.1 + 7.2). Additional providers can be added incrementally in Sprint 8 or post-release.

---

## Notes

- The composition root pattern means **zero singletons** in the codebase. Every service instance is created in `createAgentSyncSDK()` and passed down. This enables parallel SDK instances (e.g., testing, multi-project) without state conflicts.
- The `AgentSyncSDK` interface uses `Partial<Options>` for all operation options -- consumers only specify what they need, everything else gets sensible defaults.
- Provider registration order matters: GitHub is first (highest priority), Direct URL is last (catch-all). The `match()` method on each provider determines whether it handles a given source string.
- The `dispose()` method is forward-looking -- v1 may be a no-op, but the interface contract is established for future resource cleanup (cache invalidation, temp file cleanup, etc.).
