import { describe, it, expect, beforeEach } from 'vitest';
import type { OperationContext } from '../../src/operations/context.js';
import type { AgentRegistry, AgentType, AgentDetectionResult } from '../../src/types/agent.js';
import type {
  ProviderRegistry,
  SourceParser,
  GitClient,
  HostProvider,
  SourceDescriptor,
} from '../../src/types/source.js';
import type { DiscoveryService } from '../../src/discovery/index.js';
import type { Installer } from '../../src/types/install.js';
import type { LockManager, LockEntry } from '../../src/types/lock.js';
import type { SDKConfig } from '../../src/types/config.js';
import type { RemoteCognitive } from '../../src/types/cognitive.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { sourceIdentifier, safeName } from '../../src/types/brands.js';
import { isOk, isErr } from '../../src/types/result.js';
import { computeContentHash } from '../../src/lock/integrity.js';
import { UpdateOperation } from '../../src/operations/update.js';

function createMockContext(overrides?: Partial<OperationContext>): OperationContext {
  const eventBus = createCapturingEventBus();
  const fs = createMemoryFs();

  const mockAgentRegistry: AgentRegistry = {
    getAll: () => new Map(),
    get: () => undefined,
    getUniversalAgents: () => [],
    getNonUniversalAgents: () => [],
    isUniversal: () => false,
    getDir: () => undefined,
    detectInstalled: async () => [],
    register: () => {},
  };

  const mockProviderRegistry: ProviderRegistry = {
    register: () => {},
    findProvider: () => null,
    getAll: () => [],
  };

  const mockSourceParser: SourceParser = {
    parse: (source: string): SourceDescriptor => ({
      kind: 'github',
      url: source,
    }),
    getOwnerRepo: () => undefined,
  };

  const mockGitClient: GitClient = {
    clone: async () => '/tmp/cloned',
    cleanup: async () => {},
  };

  const mockDiscoveryService: DiscoveryService = {
    discover: async () => [],
    discoverByType: async () => [],
  };

  const mockInstaller: Installer = {
    install: async (_req, target, _opts) => ({
      success: true,
      agent: target.agent,
      cognitiveName: 'test',
      cognitiveType: 'skill' as const,
      path: '/project/.agents/cognit/skills/general/test',
      mode: target.mode,
    }),
    remove: async () => true,
  };

  const mockLockManager: LockManager = {
    read: async () => ({ version: 5 as const, cognitives: {} }),
    write: async () => {},
    addEntry: async () => {},
    removeEntry: async () => true,
    getEntry: async () => null,
    getAllEntries: async () => ({}),
    getBySource: async () => new Map(),
    getLastSelectedAgents: async () => undefined,
    saveLastSelectedAgents: async () => {},
  };

  const config: SDKConfig = {
    agentsDir: '.agents',
    lockFileName: '.cognit-lock.json',
    cwd: '/project',
    homeDir: '/home/user',
    fs,
    git: { cloneTimeoutMs: 30000, depth: 1 },
    providers: { custom: [] },
    agents: { additional: [] },
  };

  return {
    agentRegistry: mockAgentRegistry,
    providerRegistry: mockProviderRegistry,
    sourceParser: mockSourceParser,
    gitClient: mockGitClient,
    discoveryService: mockDiscoveryService,
    installer: mockInstaller,
    lockManager: mockLockManager,
    eventBus,
    config,
    ...overrides,
  };
}

const originalContent = '# Original Content';
const updatedContent = '# Updated Content';
const originalHash = computeContentHash(originalContent);
const updatedHash = computeContentHash(updatedContent);

function makeLockEntry(hash: string): LockEntry {
  return {
    source: sourceIdentifier('owner/repo'),
    sourceType: 'remote',
    sourceUrl: 'https://github.com/owner/repo',
    contentHash: hash,
    cognitiveType: 'skill',
    installedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function makeSameRemote(): RemoteCognitive {
  return {
    name: 'test-skill',
    description: 'test',
    content: originalContent,
    installName: safeName('test-skill'),
    sourceUrl: 'https://github.com/owner/repo',
    providerId: 'mock',
    sourceIdentifier: sourceIdentifier('owner/repo'),
    type: 'skill',
    metadata: {},
  };
}

function makeUpdatedRemote(): RemoteCognitive {
  return {
    name: 'test-skill',
    description: 'test',
    content: updatedContent,
    installName: safeName('test-skill'),
    sourceUrl: 'https://github.com/owner/repo',
    providerId: 'mock',
    sourceIdentifier: sourceIdentifier('owner/repo'),
    type: 'skill',
    metadata: {},
  };
}

function makeMockProvider(remotes: RemoteCognitive[]): HostProvider {
  return {
    id: 'mock',
    displayName: 'Mock Provider',
    match: () => ({ matches: true }),
    fetchCognitive: async () => remotes[0] ?? null,
    fetchAll: async () => remotes,
    toRawUrl: (url: string) => url,
    getSourceIdentifier: () => 'owner/repo',
  };
}

describe('UpdateOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('reports all up to date when hashes match', async () => {
    const provider = makeMockProvider([makeSameRemote()]);

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => provider,
        getAll: () => [provider],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.upToDate).toContain('test-skill');
    expect(result.value.updates).toHaveLength(0);
    expect(result.value.errors).toHaveLength(0);
  });

  it('detects available updates in checkOnly mode', async () => {
    const provider = makeMockProvider([makeUpdatedRemote()]);

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => provider,
        getAll: () => [provider],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute({ checkOnly: true });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.updates).toHaveLength(1);
    const update = result.value.updates[0];
    expect(update).toBeDefined();
    expect(update!.name).toBe('test-skill');
    expect(update!.currentHash).toBe(originalHash);
    expect(update!.newHash).toBe(updatedHash);
    expect(update!.applied).toBe(false);
    expect(result.value.message).toContain('update(s) available');
  });

  it('applies updates when confirmed=true and checkOnly is not true', async () => {
    const provider = makeMockProvider([makeUpdatedRemote()]);

    const installedAgents: AgentDetectionResult[] = [
      {
        agent: 'claude-code' as AgentType,
        displayName: 'Claude Code',
        installed: true,
        isUniversal: false,
      },
    ];

    let removeCalled = false;
    let installCalled = false;
    let addEntryCalled = false;

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
        addEntry: async () => {
          addEntryCalled = true;
        },
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => provider,
        getAll: () => [provider],
      },
      agentRegistry: {
        ...ctx.agentRegistry,
        detectInstalled: async () => installedAgents,
      },
      installer: {
        install: async (_req, target, _opts) => {
          installCalled = true;
          return {
            success: true,
            agent: target.agent,
            cognitiveName: 'test-skill',
            cognitiveType: 'skill' as const,
            path: '/project/.agents/cognit/skills/general/test-skill',
            mode: target.mode,
          };
        },
        remove: async () => {
          removeCalled = true;
          return true;
        },
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute({ confirmed: true });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.updates).toHaveLength(1);
    expect(result.value.updates[0]!.applied).toBe(true);
    expect(removeCalled).toBe(true);
    expect(installCalled).toBe(true);
    expect(addEntryCalled).toBe(true);
  });

  it('reports errors when no remote content found', async () => {
    const provider = makeMockProvider([]);

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => provider,
        getAll: () => [provider],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.errors).toHaveLength(1);
    expect(result.value.errors[0]!.name).toBe('test-skill');
    expect(result.value.errors[0]!.error).toContain('No remote content found');
  });

  it('reports errors when provider not found for source URL', async () => {
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => null,
        getAll: () => [],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.errors).toHaveLength(1);
    expect(result.value.errors[0]!.error).toContain('No provider found');
  });

  it('filters by names option', async () => {
    const provider = makeMockProvider([makeSameRemote()]);

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
          'other-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => provider,
        getAll: () => [provider],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute({ names: ['test-skill'] });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    // Only test-skill is processed; other-skill is skipped
    expect(result.value.upToDate).toEqual(['test-skill']);
    expect(result.value.upToDate).not.toContain('other-skill');
  });

  it('emits operation:start and operation:complete events', async () => {
    ctx = createMockContext();

    const op = new UpdateOperation(ctx);
    await op.execute();

    const bus = ctx.eventBus as ReturnType<typeof createCapturingEventBus>;
    const events = bus.events;

    const startEvent = events.find((e) => e.event === 'operation:start');
    const completeEvent = events.find((e) => e.event === 'operation:complete');

    expect(startEvent).toBeDefined();
    expect((startEvent!.payload as Record<string, unknown>)['operation']).toBe('update');
    expect(completeEvent).toBeDefined();
    expect((completeEvent!.payload as Record<string, unknown>)['operation']).toBe('update');
  });

  it('returns err() on unexpected error', async () => {
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => {
          throw new Error('DB connection failed');
        },
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute();

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.message).toBe('DB connection failed');
  });

  it('returns success=false when there are errors and success=true when none', async () => {
    // With errors
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(originalHash),
        }),
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => null,
        getAll: () => [],
      },
    });

    const op = new UpdateOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.success).toBe(false);
  });
});
