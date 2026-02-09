# 12 - Testing Strategy

**Author:** Agent D -- Implementation Planner
**Date:** 2026-02-09
**Status:** Plan

---

## 1. Testing Philosophy

The SDK is designed for testability from the ground up. Every module depends on interfaces, not implementations. All filesystem I/O goes through an injectable `FileSystemAdapter`. All external calls (git, HTTP) go through injectable clients. The event bus captures all side effects. This means:

- **Unit tests** are fast, deterministic, and require zero real I/O
- **Integration tests** use the in-memory filesystem, never touching disk
- **E2E tests** are the only tests that touch the real filesystem or network
- **No global state** -- tests run in parallel safely because there are no singletons

### Key Testing Principles

1. **In-memory everything** -- Use `createMemoryFs()` for all filesystem operations in unit/integration tests
2. **Event verification** -- Use `createCapturingEventBus()` to assert correct event sequences
3. **Result pattern** -- Test both `ok` and `err` paths for every operation
4. **No mocking libraries** -- Use simple hand-written fakes/stubs. The DI architecture makes this trivial.
5. **Test the contract, not the implementation** -- Test through interfaces, not internal details.

---

## 2. Test Framework & Configuration

### 2.1 Framework: Vitest

```typescript
// packages/cognit-core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__generated__/**',
        'src/**/index.ts',     // barrel files
        'src/types/**',         // pure type files (no runtime code to test)
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### 2.2 Test Directory Structure

```
packages/cognit-core/tests/
  helpers/
    fixtures.ts               # Shared test fixtures (sample cognitives, lock files, etc.)
    memory-fs.ts              # Pre-seeded memory filesystem factories
    capturing-bus.ts          # Re-export createCapturingEventBus with helpers
    mock-providers.ts         # Fake HostProvider implementations
    mock-git.ts               # Fake GitClient
    sample-agents.ts          # Minimal agent configs for testing

  types/
    branded.test.ts
    result.test.ts

  errors/
    hierarchy.test.ts
    codes.test.ts
    serialization.test.ts

  config/
    resolve.test.ts
    validation.test.ts

  events/
    event-bus.test.ts

  fs/
    memory.test.ts

  agents/
    registry.test.ts
    detector.test.ts
    generated.test.ts

  discovery/
    parser.test.ts
    scanner.test.ts
    discovery.test.ts
    plugin-manifest.test.ts

  source/
    parser.test.ts
    git.test.ts

  providers/
    registry.test.ts
    github.test.ts
    local.test.ts
    mintlify.test.ts
    huggingface.test.ts
    wellknown.test.ts
    direct.test.ts

  installer/
    paths.test.ts
    file-ops.test.ts
    installer.test.ts
    symlink.test.ts

  lock/
    manager.test.ts
    reader.test.ts
    writer.test.ts
    hash.test.ts
    migration.test.ts

  operations/
    add.test.ts
    list.test.ts
    remove.test.ts
    update.test.ts
    sync.test.ts
    check.test.ts
    init.test.ts
    find.test.ts

  integration/
    full-lifecycle.test.ts
    multi-agent.test.ts
    global-install.test.ts
    sync-drift.test.ts
    lock-migration.test.ts
    category-flow.test.ts

  e2e/
    add-from-local.test.ts
    init-and-add.test.ts

  fixtures/
    skills/
      valid-skill/SKILL.md
      minimal-skill/SKILL.md
      no-frontmatter/SKILL.md
      internal-skill/SKILL.md
    prompts/
      valid-prompt/PROMPT.md
    rules/
      valid-rule/RULE.md
    agents/
      valid-agent/AGENT.md
    lock/
      v4-lock.json
      v5-lock.json
      corrupted-lock.json
      empty-lock.json
    agent-yamls/
      minimal.yaml
      complex.yaml
      invalid-no-name.yaml
```

---

## 3. Unit Testing Per Module

### 3.1 `types/` -- Branded Types & Result Utilities

**What to test:**
- Branded type constructors validate and reject bad input
- Result utilities (`ok`, `err`, `unwrap`, `mapResult`) work correctly

```typescript
// tests/types/branded.test.ts
describe('agentName', () => {
  it('accepts valid agent names', () => {
    expect(agentName('claude-code')).toBe('claude-code');
    expect(agentName('cursor')).toBe('cursor');
    expect(agentName('a1')).toBe('a1');
  });

  it('rejects invalid agent names', () => {
    expect(() => agentName('')).toThrow();
    expect(() => agentName('Claude-Code')).toThrow(); // uppercase
    expect(() => agentName('agent name')).toThrow();  // spaces
    expect(() => agentName('-start')).toThrow();       // leading hyphen
  });
});

describe('cognitiveName', () => {
  it('rejects names with path separators', () => {
    expect(() => cognitiveName('../escape')).toThrow();
    expect(() => cognitiveName('path/name')).toThrow();
    expect(() => cognitiveName('path\\name')).toThrow();
  });
});

// tests/types/result.test.ts
describe('Result', () => {
  it('unwrap returns value for ok result', () => {
    const result = ok(42);
    expect(unwrap(result)).toBe(42);
  });

  it('unwrap throws for err result', () => {
    const error = new SomeError('failed');
    const result = err(error);
    expect(() => unwrap(result)).toThrow(error);
  });

  it('mapResult transforms ok value', () => {
    const result = ok(5);
    const mapped = mapResult(result, (v) => v * 2);
    expect(mapped).toEqual({ ok: true, value: 10 });
  });

  it('mapResult passes through err', () => {
    const error = new SomeError('failed');
    const result = err(error);
    const mapped = mapResult(result, (v) => v * 2);
    expect(mapped).toEqual({ ok: false, error });
  });
});
```

### 3.2 `errors/` -- Error Hierarchy

**What to test:**
- `instanceof` chains work correctly
- `code` and `module` properties are set
- `toJSON()` produces structured output
- Error constructors accept and pass through `cause`

```typescript
// tests/errors/hierarchy.test.ts
describe('Error hierarchy', () => {
  it('ProviderFetchError is instance of ProviderError and CognitError', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    expect(error).toBeInstanceOf(ProviderFetchError);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toBeInstanceOf(CognitError);
    expect(error).toBeInstanceOf(Error);
  });

  it('all errors have code and module', () => {
    const errors = [
      new ProviderFetchError('url', 'github'),
      new PathTraversalError('/bad/path'),
      new ParseError('/file.md'),
      new LockReadError('/lock.json'),
      new InvalidConfigError('cwd', 'empty'),
      new GitCloneError('url', 'timeout'),
      new AgentNotFoundError('unknown'),
    ];

    for (const error of errors) {
      expect(error.code).toBeTruthy();
      expect(error.module).toBeTruthy();
    }
  });

  it('toJSON produces structured output', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'ProviderFetchError',
      code: 'PROVIDER_FETCH_ERROR',
      module: 'providers',
      message: expect.stringContaining('github'),
      cause: undefined,
    });
  });
});
```

### 3.3 `config/` -- SDK Configuration

**What to test:**
- `resolveConfig()` applies all defaults when called with no args
- `resolveConfig()` merges partial overrides correctly
- `validateConfig()` rejects invalid configurations

```typescript
// tests/config/resolve.test.ts
describe('resolveConfig', () => {
  it('applies all defaults when called with no args', () => {
    const config = resolveConfig();
    expect(config.agentsDir).toBe('.agents');
    expect(config.lockFileName).toBe('.cognit-lock.json');
    expect(config.git.cloneTimeoutMs).toBe(30_000);
    expect(config.git.depth).toBe(1);
    expect(config.telemetry.enabled).toBe(true);
    expect(config.fs).toBeDefined();
  });

  it('merges partial overrides', () => {
    const config = resolveConfig({
      agentsDir: 'custom-agents',
      git: { cloneTimeoutMs: 60_000, depth: 3 },
    });
    expect(config.agentsDir).toBe('custom-agents');
    expect(config.git.cloneTimeoutMs).toBe(60_000);
    expect(config.git.depth).toBe(3);
    // Other defaults preserved
    expect(config.lockFileName).toBe('.cognit-lock.json');
  });
});
```

### 3.4 `events/` -- Event Bus

**What to test:**
- Handlers receive correct typed payloads
- `once()` fires exactly once
- Unsubscribe removes handler
- Capturing bus records events in order

```typescript
// tests/events/event-bus.test.ts
describe('EventBusImpl', () => {
  it('delivers typed payloads to handlers', () => {
    const bus = new EventBusImpl();
    const received: unknown[] = [];

    bus.on('discovery:found', (payload) => {
      received.push(payload);
    });

    bus.emit('discovery:found', {
      cognitive: { name: 'test' as CognitiveName, type: 'skill', path: '/test', description: 'Test' },
      type: 'skill',
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toHaveProperty('cognitive.name', 'test');
  });

  it('once fires exactly once', () => {
    const bus = new EventBusImpl();
    let callCount = 0;

    bus.once('sdk:initialized', () => { callCount++; });
    bus.emit('sdk:initialized', { configHash: 'abc' });
    bus.emit('sdk:initialized', { configHash: 'def' });

    expect(callCount).toBe(1);
  });

  it('unsubscribe removes handler', () => {
    const bus = new EventBusImpl();
    let callCount = 0;

    const unsub = bus.on('sdk:error', () => { callCount++; });
    bus.emit('sdk:error', { error: new SomeError('test') });
    expect(callCount).toBe(1);

    unsub();
    bus.emit('sdk:error', { error: new SomeError('test') });
    expect(callCount).toBe(1); // Not called again
  });
});

describe('createCapturingEventBus', () => {
  it('records all emitted events in order', () => {
    const bus = createCapturingEventBus();
    bus.emit('operation:start', { operation: 'add', options: {} });
    bus.emit('discovery:start', { path: '/tmp' });
    bus.emit('operation:complete', { operation: 'add', result: {}, durationMs: 100 });

    expect(bus.events).toHaveLength(3);
    expect(bus.events[0].event).toBe('operation:start');
    expect(bus.events[1].event).toBe('discovery:start');
    expect(bus.events[2].event).toBe('operation:complete');
  });
});
```

### 3.5 `fs/` -- In-Memory Filesystem

**What to test:**
- `mkdir` with `recursive: true`
- `readFile`/`writeFile` round-trip
- `readdir` with `withFileTypes`
- `symlink` and `readlink`
- `exists` for files, directories, and missing paths
- `rm` with recursive
- `stat`/`lstat` (isFile, isDirectory, isSymbolicLink)

```typescript
// tests/fs/memory.test.ts
describe('createMemoryFs', () => {
  it('supports recursive mkdir', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/a/b/c', { recursive: true });
    expect(await fs.exists('/a/b/c')).toBe(true);
    expect(await fs.exists('/a/b')).toBe(true);
    expect(await fs.exists('/a')).toBe(true);
  });

  it('supports readFile/writeFile round-trip', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/dir', { recursive: true });
    await fs.writeFile('/dir/file.txt', 'hello', 'utf-8');
    const content = await fs.readFile('/dir/file.txt', 'utf-8');
    expect(content).toBe('hello');
  });

  it('supports symlink and readlink', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/source', { recursive: true });
    await fs.writeFile('/source/file.txt', 'data', 'utf-8');
    await fs.symlink('/source', '/link');
    const target = await fs.readlink('/link');
    expect(target).toBe('/source');
  });

  it('supports readdir with file types', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/dir/sub', { recursive: true });
    await fs.writeFile('/dir/file.txt', 'data', 'utf-8');
    const entries = await fs.readdir('/dir', { withFileTypes: true });
    expect(entries).toHaveLength(2);
    const file = entries.find(e => e.name === 'file.txt');
    const sub = entries.find(e => e.name === 'sub');
    expect(file?.isFile()).toBe(true);
    expect(sub?.isDirectory()).toBe(true);
  });

  it('can be seeded with initial files', async () => {
    const fs = createMemoryFs({
      '/project/.agents/cognit/skills/frontend/react-19/SKILL.md': '---\nname: React 19\n---',
    });
    const content = await fs.readFile('/project/.agents/cognit/skills/frontend/react-19/SKILL.md', 'utf-8');
    expect(content).toContain('React 19');
  });
});
```

### 3.6 `agents/` -- Agent Registry

**What to test:**
- `getAll()` returns all registered agents
- `get()` returns specific agent or undefined
- `getUniversalAgents()` returns agents with `.agents` localRoot
- `isUniversal()` detects universal agents
- `getDir()` resolves correct paths
- `register()` adds runtime agents, rejects duplicates
- `detectInstalled()` with mock filesystem

```typescript
// tests/agents/registry.test.ts
describe('AgentRegistryImpl', () => {
  it('returns all generated agents', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    const all = registry.getAll();
    expect(all.size).toBeGreaterThan(35); // 39+ agents
    expect(all.has('claude-code')).toBe(true);
    expect(all.has('cursor')).toBe(true);
  });

  it('detects universal agents', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    expect(registry.isUniversal('codex' as AgentType)).toBe(true);  // localRoot: .agents
    expect(registry.isUniversal('cursor' as AgentType)).toBe(false); // localRoot: .cursor
  });

  it('resolves agent directories', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    const dir = registry.getDir('claude-code' as AgentType, 'skill', 'local');
    expect(dir).toBe('.claude/skills');
  });
});
```

### 3.7 `discovery/` -- Cognitive Discovery

**What to test:**
- Frontmatter parsing: valid, minimal, missing fields, invalid YAML
- Scanner: finds files in nested directories
- Full discovery: type filtering, subpath filtering, internal filtering
- Plugin manifest parsing

```typescript
// tests/discovery/parser.test.ts
describe('parseCognitiveMd', () => {
  it('parses valid frontmatter', () => {
    const content = `---
name: React 19 Best Practices
description: Modern React patterns
version: 1.2.0
category: frontend
tags:
  - react
  - typescript
---
# React 19 Best Practices
Content here.`;

    const result = parseCognitiveMd(content, '/skills/react-19/SKILL.md');
    expect(result.name).toBe('React 19 Best Practices');
    expect(result.description).toBe('Modern React patterns');
    expect(result.metadata.version).toBe('1.2.0');
    expect(result.metadata.category).toBe('frontend');
    expect(result.metadata.tags).toEqual(['react', 'typescript']);
  });

  it('throws ParseError for missing name', () => {
    const content = `---
description: No name here
---
Content.`;

    expect(() => parseCognitiveMd(content, '/file.md')).toThrow(ParseError);
  });

  it('throws ParseError for missing description', () => {
    const content = `---
name: Has Name
---
Content.`;

    expect(() => parseCognitiveMd(content, '/file.md')).toThrow(ParseError);
  });
});
```

### 3.8 `source/` -- Source Parsing

**What to test:**
- All source input variants (see 05-provider-system.md Section 6.3)

```typescript
// tests/source/parser.test.ts
describe('SourceParserImpl', () => {
  const parser = new SourceParserImpl();

  const cases: Array<[string, Partial<SourceDescriptor>]> = [
    ['vercel-labs/skills', { kind: 'github', url: expect.stringContaining('vercel-labs/skills') }],
    ['vercel-labs/skills/react', { kind: 'github', subpath: 'react' }],
    ['vercel-labs/skills@find-skills', { kind: 'github', nameFilter: 'find-skills' }],
    ['./my-skills', { kind: 'local' }],
    ['/abs/path/skills', { kind: 'local' }],
    ['.', { kind: 'local' }],
    ['https://github.com/o/r', { kind: 'github' }],
    ['https://github.com/o/r/tree/main', { kind: 'github', ref: 'main' }],
    ['https://github.com/o/r/tree/main/skills', { kind: 'github', ref: 'main', subpath: 'skills' }],
    ['https://docs.bun.com/docs/SKILL.md', { kind: 'direct-url' }],
    ['https://example.com', { kind: 'well-known' }],
  ];

  it.each(cases)('parses "%s" correctly', (input, expected) => {
    const result = parser.parse(input);
    expect(result).toMatchObject(expected);
  });
});
```

### 3.9 `providers/` -- Provider System

**What to test per provider:**
- `match()` with matching and non-matching URLs
- `toRawUrl()` conversion
- `getSourceIdentifier()` determinism
- `fetchCognitive()` with mocked HTTP (success and failure)
- `fetchAll()` for providers that support it

```typescript
// tests/providers/github.test.ts
describe('GitHubProvider', () => {
  const provider = new GitHubProvider();

  it('matches GitHub URLs', () => {
    expect(provider.match('https://github.com/owner/repo').matches).toBe(true);
    expect(provider.match('https://github.com/o/r/tree/main').matches).toBe(true);
  });

  it('does not match non-GitHub URLs', () => {
    expect(provider.match('https://gitlab.com/owner/repo').matches).toBe(false);
    expect(provider.match('./local-path').matches).toBe(false);
  });

  it('converts blob URLs to raw URLs', () => {
    expect(provider.toRawUrl('https://github.com/o/r/blob/main/SKILL.md'))
      .toBe('https://raw.githubusercontent.com/o/r/main/SKILL.md');
  });

  it('returns stable source identifier', () => {
    expect(provider.getSourceIdentifier('https://github.com/owner/repo')).toBe('owner/repo');
    expect(provider.getSourceIdentifier('https://github.com/owner/repo/tree/main')).toBe('owner/repo');
  });
});
```

### 3.10 `installer/` -- Installation System

**What to test:**
- Path sanitization
- Path traversal prevention
- Symlink mode: canonical dir created + symlinks for non-universal agents
- Copy mode: direct copy to agent dir
- Symlink fallback to copy
- Universal agent skip (no symlink needed)
- ELOOP detection

```typescript
// tests/installer/paths.test.ts
describe('sanitizeName', () => {
  it.each([
    ['React 19', 'react-19'],
    ['my_skill', 'my-skill'],
    ['../escape', 'escape'],
    ['...dots...', 'dots'],
    ['UPPER', 'upper'],
    ['a'.repeat(300), expect.stringMatching(/^a{255}$/)],
    ['', 'unnamed-cognitive'],
  ])('sanitizes "%s" to "%s"', (input, expected) => {
    expect(sanitizeName(input)).toBe(expected);
  });
});

describe('isPathSafe', () => {
  it('accepts paths within base', () => {
    expect(isPathSafe('/project', '/project/sub/file')).toBe(true);
  });

  it('rejects paths escaping base', () => {
    expect(isPathSafe('/project', '/project/../escape')).toBe(false);
    expect(isPathSafe('/project', '/other/dir')).toBe(false);
  });
});

// tests/installer/installer.test.ts
describe('InstallerImpl', () => {
  it('creates canonical dir and symlink for non-universal agent', async () => {
    const fs = createMemoryFs();
    const registry = createTestAgentRegistry(); // cursor = non-universal
    const fileOps = new FileOperationsImpl(fs);
    const eventBus = createCapturingEventBus();
    const installer = new InstallerImpl(registry, fileOps, eventBus);

    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'cursor' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/project' },
    );

    expect(result.success).toBe(true);
    // Canonical dir exists
    expect(await fs.exists('/project/.agents/cognit/skills/general/test-skill/SKILL.md')).toBe(true);
    // Symlink exists
    expect(await fs.exists('/project/.cursor/skills/test-skill')).toBe(true);
  });

  it('skips symlink for universal agent', async () => {
    // codex uses .agents/ as localRoot -- no symlink needed
    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'codex' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/project' },
    );

    expect(result.success).toBe(true);
    // Canonical dir is the agent dir -- no symlink
  });

  it('falls back to copy when symlink fails', async () => {
    const fs = createMemoryFs();
    // Make symlink throw
    const originalSymlink = fs.symlink;
    fs.symlink = async () => { throw new Error('EPERM'); };

    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'cursor' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/project' },
    );

    expect(result.success).toBe(true);
    expect(result.symlinkFailed).toBe(true);
    expect(result.mode).toBe('copy');
    fs.symlink = originalSymlink;
  });
});
```

### 3.11 `lock/` -- Lock File System

**What to test:**
- Read: valid v5, valid v4 (migration), corrupted JSON, missing file
- Write: atomic write, content round-trip
- CRUD: addEntry, removeEntry, getEntry, getAllEntries
- Grouping: getBySource
- Hash: computeContentHash determinism
- Migration: v4 -> v5 field mapping

```typescript
// tests/lock/manager.test.ts
describe('LockManagerImpl', () => {
  it('returns empty lock when file does not exist', async () => {
    const fs = createMemoryFs();
    const manager = new LockManagerImpl(config, new FileOperationsImpl(fs), eventBus);
    const lock = await manager.read();
    expect(lock.version).toBe(5);
    expect(Object.keys(lock.cognitives)).toHaveLength(0);
  });

  it('adds and retrieves entries', async () => {
    const fs = createMemoryFs();
    const manager = new LockManagerImpl(config, new FileOperationsImpl(fs), eventBus);

    await manager.addEntry('test-skill', {
      source: 'owner/repo' as SourceIdentifier,
      sourceType: 'github',
      sourceUrl: 'https://github.com/owner/repo',
      contentHash: 'abc123',
      cognitiveType: 'skill',
    });

    const entry = await manager.getEntry('test-skill');
    expect(entry).not.toBeNull();
    expect(entry!.source).toBe('owner/repo');
    expect(entry!.installedAt).toBeTruthy();
    expect(entry!.updatedAt).toBeTruthy();
  });

  it('removeEntry returns true if existed', async () => {
    // ... add then remove, verify true
  });

  it('removeEntry returns false if not found', async () => {
    const result = await manager.removeEntry('nonexistent');
    expect(result).toBe(false);
  });
});
```

### 3.12 `operations/` -- SDK Operations

**What to test per operation:**
- Happy path with all mocked dependencies
- Error paths (not found, parse error, etc.)
- Event emission sequence
- Non-interactive design (returns data, not prompts)

```typescript
// tests/operations/add.test.ts
describe('AddOperation', () => {
  it('completes full add flow', async () => {
    const eventBus = createCapturingEventBus();
    const fakeFs = createMemoryFs({
      '/tmp/clone/skills/react-19/SKILL.md': '---\nname: React 19\ndescription: React patterns\n---\nContent',
    });
    const fakeGit: GitClient = {
      clone: async () => '/tmp/clone',
      cleanup: async () => {},
    };

    const addOp = new AddOperation({
      discoveryService: new DiscoveryServiceImpl(fakeFs, eventBus),
      providerRegistry: new ProviderRegistryImpl(eventBus),
      sourceParser: new SourceParserImpl(),
      gitClient: fakeGit,
      installer: createTestInstaller(fakeFs, eventBus),
      lockManager: createTestLockManager(fakeFs, eventBus),
      agentRegistry: createTestAgentRegistry(),
      eventBus,
      config: resolveConfig({ fs: fakeFs, cwd: '/project' }),
    });

    const result = await addOp.execute('owner/repo', {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      mode: 'symlink',
      installAll: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.installed).toHaveLength(1);
      expect(result.value.installed[0].cognitive.name).toBe('React 19');
    }

    // Verify event sequence
    const eventTypes = eventBus.events.map(e => e.event);
    expect(eventTypes).toContain('operation:start');
    expect(eventTypes).toContain('git:clone:start');
    expect(eventTypes).toContain('discovery:start');
    expect(eventTypes).toContain('install:start');
    expect(eventTypes).toContain('operation:complete');
  });

  it('returns discovered cognitives when no agents specified', async () => {
    // Test the two-phase non-interactive pattern
    const result = await addOp.execute('owner/repo', {
      // No agents specified
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.discovered).toHaveLength(1);
      expect(result.value.installed).toHaveLength(0);
    }
  });
});
```

---

## 4. Integration Testing

Integration tests wire real implementations together with the in-memory filesystem. They test module interactions without touching the real disk or network.

### 4.1 Full Lifecycle Test

```typescript
// tests/integration/full-lifecycle.test.ts
describe('Full lifecycle: add -> list -> update -> remove', () => {
  let sdk: CognitSDK;
  let fs: FileSystemAdapter;

  beforeEach(() => {
    fs = createMemoryFs();
    sdk = createCognitSDK({
      cwd: '/project',
      fs,
      telemetry: { enabled: false },
    });
  });

  it('adds, lists, and removes a cognitive', async () => {
    // 1. Add from a local path
    await seedMemoryFs(fs, {
      '/source/skills/my-skill/SKILL.md': `---
name: My Skill
description: Test skill
---
Content here.`,
    });

    const addResult = await sdk.add('/source', {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      installAll: true,
    });
    expect(addResult.ok).toBe(true);

    // 2. List
    const listResult = await sdk.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value.cognitives).toHaveLength(1);
      expect(listResult.value.cognitives[0].cognitive.name).toBe('My Skill');
    }

    // 3. Remove
    const removeResult = await sdk.remove('my-skill');
    expect(removeResult.ok).toBe(true);

    // 4. Verify gone
    const listResult2 = await sdk.list();
    expect(listResult2.ok).toBe(true);
    if (listResult2.ok) {
      expect(listResult2.value.cognitives).toHaveLength(0);
    }
  });
});
```

### 4.2 Multi-Agent Installation

```typescript
// tests/integration/multi-agent.test.ts
describe('Multi-agent installation', () => {
  it('installs to claude-code and cursor with correct symlinks', async () => {
    const fs = createMemoryFs();
    const sdk = createCognitSDK({ cwd: '/project', fs });

    await seedSkill(fs, '/source', 'react-19', 'React 19');

    const result = await sdk.add('/source', {
      agents: ['claude-code', 'cursor'] as AgentType[],
      scope: 'project',
      mode: 'symlink',
      installAll: true,
    });

    expect(result.ok).toBe(true);

    // Canonical dir exists
    expect(await fs.exists('/project/.agents/cognit/skills/general/react-19/SKILL.md')).toBe(true);

    // Claude symlink
    expect(await fs.exists('/project/.claude/skills/react-19')).toBe(true);
    const claudeLink = await fs.readlink('/project/.claude/skills/react-19');
    expect(claudeLink).toContain('.agents/cognit/skills');

    // Cursor symlink
    expect(await fs.exists('/project/.cursor/skills/react-19')).toBe(true);
  });
});
```

### 4.3 Sync Drift Detection

```typescript
// tests/integration/sync-drift.test.ts
describe('Sync drift detection', () => {
  it('detects and fixes broken symlink', async () => {
    const fs = createMemoryFs();
    const sdk = createCognitSDK({ cwd: '/project', fs });

    // Install a cognitive
    await seedAndInstall(sdk, fs);

    // Break the symlink by removing canonical dir
    await fs.rm('/project/.agents/cognit/skills/general/test-skill', { recursive: true });

    // Sync should detect drift
    const syncResult = await sdk.sync();
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.value.synced.length).toBeGreaterThan(0);
    }
  });
});
```

### 4.4 Lock File Migration

```typescript
// tests/integration/lock-migration.test.ts
describe('Lock file migration', () => {
  it('migrates v4 lock file to v5 on first read', async () => {
    const v4Lock = {
      version: 4,
      cognitives: {
        'my-skill': {
          source: 'owner/repo',
          sourceType: 'github',
          sourceUrl: 'https://github.com/owner/repo',
          cognitiveFolderHash: 'abc123',
          cognitiveType: 'skill',
          installedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      lastSelectedAgents: ['claude-code'],
    };

    const fs = createMemoryFs({
      '/project/.agents/cognit/.cognit-lock.json': JSON.stringify(v4Lock),
    });

    const sdk = createCognitSDK({ cwd: '/project', fs });
    const listResult = await sdk.list({ includeLockData: true });

    expect(listResult.ok).toBe(true);
    // Verify migration happened (v4 cognitives -> v5 entries)
  });
});
```

---

## 5. E2E Testing

E2E tests use the real filesystem and (optionally) network. They are slower and may be skipped in CI without network access.

### 5.1 Add From Local Path

```typescript
// tests/e2e/add-from-local.test.ts
describe('E2E: Add from local path', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cognit-test-'));
    // Create a skill file
    const skillDir = join(tempDir, 'source', 'skills', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), `---
name: Test Skill
description: A test skill for E2E
---
# Test Skill
This is a test skill.`);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('installs a skill from a local directory', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createCognitSDK({ cwd: projectDir });

    const result = await sdk.add(join(tempDir, 'source'), {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      installAll: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.installed).toHaveLength(1);
    }

    // Verify files on real filesystem
    const canonicalPath = join(projectDir, '.agents', 'cognit', 'skills', 'general', 'test-skill', 'SKILL.md');
    expect(existsSync(canonicalPath)).toBe(true);
  });
});
```

### 5.2 Init and Add

```typescript
// tests/e2e/init-and-add.test.ts
describe('E2E: Init a cognitive and add it', () => {
  it('scaffolds a new skill and installs it', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cognit-test-'));
    const sdk = createCognitSDK({ cwd: tempDir });

    // Init
    const initResult = await sdk.init({ name: 'my-new-skill', cognitiveType: 'skill' });
    // (init is an operation, not on the CognitSDK interface yet -- adjust if needed)

    // Verify template was created
    expect(existsSync(join(tempDir, 'my-new-skill', 'SKILL.md'))).toBe(true);

    // Clean up
    await rm(tempDir, { recursive: true, force: true });
  });
});
```

---

## 6. Test Fixtures

### 6.1 Cognitive File Fixtures

```markdown
<!-- fixtures/skills/valid-skill/SKILL.md -->
---
name: Valid Test Skill
description: A skill with all frontmatter fields
version: 1.0.0
category: frontend
tags:
  - react
  - testing
author: Test Author
globs:
  - "**/*.tsx"
---
# Valid Test Skill

This is a valid test skill with complete frontmatter.

## Instructions
Do the thing correctly.
```

```markdown
<!-- fixtures/skills/minimal-skill/SKILL.md -->
---
name: Minimal Skill
description: Only required fields
---
# Minimal Skill

Content.
```

```markdown
<!-- fixtures/skills/no-frontmatter/SKILL.md -->
# No Frontmatter

This file has no YAML frontmatter and should fail parsing.
```

```markdown
<!-- fixtures/skills/internal-skill/SKILL.md -->
---
name: Internal Skill
description: Should be skipped by default discovery
internal: true
---
# Internal Skill

Hidden from normal discovery.
```

### 6.2 Lock File Fixtures

```json
// fixtures/lock/v4-lock.json
{
  "version": 4,
  "cognitives": {
    "react-19": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "cognitivePath": "skills/react-19",
      "cognitiveFolderHash": "abc123",
      "cognitiveType": "skill",
      "installedAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  },
  "lastSelectedAgents": ["claude-code", "cursor"]
}
```

```json
// fixtures/lock/v5-lock.json
{
  "version": 5,
  "cognitives": {
    "react-19": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "contentHash": "e3b0c442...",
      "cognitiveType": "skill",
      "installedAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  }
}
```

### 6.3 Agent YAML Fixtures

```yaml
# fixtures/agent-yamls/minimal.yaml
name: test-agent
displayName: Test Agent
rootDir: .test-agent
```

```yaml
# fixtures/agent-yamls/complex.yaml
name: complex-agent
displayName: Complex Agent
localRoot: .agents
globalRoot: ${XDG_CONFIG_HOME}/complex-agent
detect:
  - xdgConfig: complex-agent
  - envResolvedPath:
      var: claudeHome
      subpath: skills
showInUniversalList: false
```

---

## 7. Mocks and Fakes

### 7.1 In-Memory Filesystem (Primary Test Tool)

The `createMemoryFs(seed?)` function is the primary testing tool. It implements `FileSystemAdapter` with an in-memory tree:

```typescript
// Seed with files
const fs = createMemoryFs({
  '/project/.agents/cognit/skills/frontend/react-19/SKILL.md': '---\nname: React 19\n---',
  '/project/.claude/skills/react-19': '@symlink:/project/.agents/cognit/skills/frontend/react-19',
});
```

### 7.2 Capturing Event Bus

```typescript
// Captures all events for assertion
const bus = createCapturingEventBus();
// After operation:
expect(bus.events).toEqual([
  { event: 'operation:start', payload: expect.objectContaining({ operation: 'add' }) },
  { event: 'discovery:start', payload: expect.objectContaining({ path: '/tmp' }) },
  // ...
]);
```

### 7.3 Fake Git Client

```typescript
// tests/helpers/mock-git.ts
export function createFakeGitClient(cloneResult: string): GitClient {
  return {
    clone: async () => cloneResult,
    cleanup: async () => {},
  };
}
```

### 7.4 Fake Provider

```typescript
// tests/helpers/mock-providers.ts
export function createFakeProvider(
  id: string,
  matchPattern: RegExp,
  cognitives: RemoteCognitive[],
): HostProvider {
  return {
    id,
    displayName: `Fake ${id}`,
    match: (source) => ({ matches: matchPattern.test(source) }),
    fetchCognitive: async () => cognitives[0] ?? null,
    fetchAll: async () => cognitives,
    toRawUrl: (url) => url,
    getSourceIdentifier: (source) => `fake/${id}`,
  };
}
```

---

## 8. Testing Filesystem Operations

### 8.1 Strategy

All filesystem operations go through `FileSystemAdapter`. Unit and integration tests use `createMemoryFs()`. Only E2E tests use the real filesystem.

### 8.2 What the In-Memory FS Must Support

| Operation | Required Behavior |
|-----------|-------------------|
| `readFile` | Return content or throw ENOENT |
| `writeFile` | Create file (and parent dirs if missing) |
| `mkdir` | Create directory, support `recursive: true` |
| `readdir` | Return entries with `isFile()`, `isDirectory()`, `isSymbolicLink()` |
| `stat` | Return stats for real path (follow symlinks) |
| `lstat` | Return stats without following symlinks |
| `symlink` | Create symbolic link entry |
| `readlink` | Return symlink target |
| `rm` | Remove file/dir, support `recursive: true`, `force: true` |
| `rename` | Atomic move (for lock file writes) |
| `exists` | True if path exists (follow symlinks) |
| `copyDirectory` | Recursive directory copy |

### 8.3 Testing Symlink Behavior

```typescript
describe('Symlink operations', () => {
  it('creates and resolves symlinks', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/source/dir', { recursive: true });
    await fs.writeFile('/source/dir/file.txt', 'content', 'utf-8');
    await fs.symlink('/source/dir', '/link');

    // lstat sees symlink
    const lstats = await fs.lstat('/link');
    expect(lstats.isSymbolicLink()).toBe(true);

    // stat follows symlink
    const stats = await fs.stat('/link');
    expect(stats.isDirectory()).toBe(true);

    // readlink returns target
    const target = await fs.readlink('/link');
    expect(target).toBe('/source/dir');
  });
});
```

---

## 9. Testing the YAML Compile Pipeline

### 9.1 Compile Script Tests

```typescript
// tests/scripts/compile-agents.test.ts
describe('compile-agents', () => {
  it('generates correct AgentType union from YAML files', async () => {
    const yamls = [
      { path: 'test-a.yaml', content: 'name: test-a\ndisplayName: Test A\nrootDir: .test-a' },
      { path: 'test-b.yaml', content: 'name: test-b\ndisplayName: Test B\nrootDir: .test-b' },
    ];

    const result = await compileAgents(yamls, cognitiveTypes);

    expect(result.agentType).toContain("'test-a'");
    expect(result.agentType).toContain("'test-b'");
  });

  it('rejects duplicate agent names', () => {
    const yamls = [
      { path: 'dup.yaml', content: 'name: dup\ndisplayName: Dup\nrootDir: .dup' },
      { path: 'dup2.yaml', content: 'name: dup\ndisplayName: Dup 2\nrootDir: .dup2' },
    ];

    expect(() => validateAgents(yamls)).toThrow(/Duplicate agent name/);
  });

  it('applies conventions when only rootDir is specified', () => {
    const yaml = { path: 'simple.yaml', content: 'name: simple\ndisplayName: Simple\nrootDir: .simple' };
    const resolved = resolveAgent(yaml);

    expect(resolved.localRoot).toBe('.simple');
    expect(resolved.globalRoot).toBe('~/.simple');
    expect(resolved.detect).toEqual([{ homeDir: '.simple' }]);
  });

  it('generates detectInstalled function bodies', () => {
    const yamls = [
      { path: 'test.yaml', content: `name: test\ndisplayName: Test\nrootDir: .test\ndetect:\n  - homeDir: ".test"` },
    ];

    const result = compileAgents(yamls, cognitiveTypes);
    expect(result.agents).toContain('existsSync(join(home,');
  });
});
```

---

## 10. Coverage Targets

### 10.1 Per-Module Targets

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `types/branded.ts` | 95% | 90% | 95% | 95% |
| `types/result.ts` | 100% | 100% | 100% | 100% |
| `errors/*` | 90% | 85% | 90% | 90% |
| `config/*` | 90% | 85% | 90% | 90% |
| `events/*` | 95% | 90% | 95% | 95% |
| `fs/memory.ts` | 90% | 85% | 90% | 90% |
| `agents/registry.ts` | 85% | 80% | 85% | 85% |
| `agents/detector.ts` | 80% | 75% | 80% | 80% |
| `discovery/parser.ts` | 90% | 85% | 90% | 90% |
| `discovery/scanner.ts` | 85% | 80% | 85% | 85% |
| `providers/registry.ts` | 90% | 85% | 90% | 90% |
| `providers/*.ts` (each) | 80% | 75% | 80% | 80% |
| `source/parser.ts` | 90% | 85% | 90% | 90% |
| `source/git.ts` | 75% | 70% | 75% | 75% |
| `installer/installer.ts` | 85% | 80% | 85% | 85% |
| `installer/file-ops.ts` | 85% | 80% | 85% | 85% |
| `installer/paths.ts` | 95% | 90% | 95% | 95% |
| `lock/manager.ts` | 90% | 85% | 90% | 90% |
| `lock/reader.ts` | 85% | 80% | 85% | 85% |
| `lock/hash.ts` | 90% | 85% | 90% | 90% |
| `lock/migration.ts` | 85% | 80% | 85% | 85% |
| `operations/*.ts` (each) | 80% | 75% | 80% | 80% |
| `sdk.ts` | 85% | 80% | 85% | 85% |
| **Overall** | **85%** | **80%** | **85%** | **85%** |

### 10.2 Exclusions from Coverage

- `src/**/__generated__/**` -- auto-generated code
- `src/**/index.ts` -- barrel re-exports (no logic)
- `src/types/**` -- pure type files with no runtime code (except branded.ts and result.ts which have constructors)
- `src/fs/node.ts` -- thin wrapper over Node.js stdlib (tested by integration/E2E)

---

## 11. CI Integration

### 11.1 GitHub Actions Workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run compile-agents
      - run: pnpm run lint
      - run: pnpm run build
      - run: pnpm run test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: packages/cognit-core/coverage/lcov.info
```

### 11.2 Test Run Modes

| Mode | Command | What Runs | When |
|------|---------|-----------|------|
| Unit | `vitest run` | All unit tests | Every commit |
| Integration | `vitest run tests/integration/` | Integration tests | Every commit |
| E2E (local) | `vitest run tests/e2e/ --exclude *github*` | E2E without network | Every commit |
| E2E (full) | `vitest run tests/e2e/` | All E2E including network | Manual / nightly |
| Coverage | `vitest run --coverage` | All tests + coverage | Every PR |

---

## 12. Test Quality Checklist

For every module, before considering it "tested":

- [ ] Happy path covered
- [ ] Error/failure paths covered
- [ ] Edge cases identified and tested (empty input, null, boundary values)
- [ ] Events verified (correct events emitted in correct order)
- [ ] Result pattern tested (both `ok` and `err` branches)
- [ ] No test depends on test execution order
- [ ] No test depends on real filesystem or network (except E2E)
- [ ] No test uses `setTimeout` or other timing-dependent constructs
- [ ] Test names clearly describe what is being tested
- [ ] Fixtures are shared via `tests/helpers/` and `tests/fixtures/`
