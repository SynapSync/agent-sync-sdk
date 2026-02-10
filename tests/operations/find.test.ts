import { describe, it, expect, beforeEach } from 'vitest';
import type { OperationContext } from '../../src/operations/context.js';
import type { AgentRegistry, AgentType, AgentConfig } from '../../src/types/agent.js';
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
import { safeName, sourceIdentifier } from '../../src/types/brands.js';
import { isOk, isErr } from '../../src/types/result.js';
import { FindOperation } from '../../src/operations/find.js';

function createMockRemoteCognitive(
  overrides?: Partial<RemoteCognitive>,
): RemoteCognitive {
  return {
    name: 'test-skill',
    description: 'A test skill',
    content: '# Test Skill',
    installName: safeName('test-skill'),
    sourceUrl: 'https://github.com/owner/repo',
    providerId: 'mock',
    sourceIdentifier: sourceIdentifier('owner/repo'),
    type: 'skill',
    metadata: {},
    ...overrides,
  };
}

function createMockProvider(
  remoteCognitives: RemoteCognitive[] = [createMockRemoteCognitive()],
): HostProvider {
  return {
    id: 'mock',
    displayName: 'Mock',
    match: () => ({ matches: true }),
    fetchCognitive: async () => null,
    fetchAll: async () => remoteCognitives,
    toRawUrl: (url) => url,
    getSourceIdentifier: () => 'owner/repo',
  };
}

function createMockLockEntry(
  overrides?: Partial<LockEntry>,
): LockEntry {
  return {
    source: sourceIdentifier('owner/repo'),
    sourceType: 'remote',
    sourceUrl: 'https://github.com/owner/repo',
    contentHash: 'abc123',
    cognitiveType: 'skill',
    installedAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockContext(
  overrides?: Partial<OperationContext>,
): OperationContext {
  const eventBus = createCapturingEventBus();
  const fs = createMemoryFs();

  const mockAgentRegistry: AgentRegistry = {
    getAll: () => new Map<AgentType, AgentConfig>(),
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
    telemetry: { enabled: false },
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

describe('FindOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('returns found cognitives from provider', async () => {
    const remoteCog = createMockRemoteCognitive();
    const mockProvider = createMockProvider([remoteCog]);

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.total).toBe(1);
    expect(result.value.results).toHaveLength(1);

    const first = result.value.results[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.name).toBe('test-skill');
      expect(first.description).toBe('A test skill');
      expect(first.cognitiveType).toBe('skill');
      expect(first.installed).toBe(false);
    }
  });

  it('returns empty results when no provider matches', async () => {
    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => null,
        getAll: () => [],
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://unknown.host/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(false);
    expect(result.value.total).toBe(0);
    expect(result.value.results).toHaveLength(0);
    expect(result.value.message).toContain('No cognitives found');
  });

  it('marks installed cognitives correctly', async () => {
    const remoteCog = createMockRemoteCognitive({
      installName: safeName('installed-skill'),
    });
    const mockProvider = createMockProvider([remoteCog]);
    const lockEntry = createMockLockEntry();

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({ 'installed-skill': lockEntry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.results).toHaveLength(1);

    const first = result.value.results[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.name).toBe('installed-skill');
      expect(first.installed).toBe(true);
    }
  });

  it('applies cognitiveType filter', async () => {
    const skillCog = createMockRemoteCognitive({
      installName: safeName('my-skill'),
      type: 'skill',
    });
    const ruleCog = createMockRemoteCognitive({
      name: 'my-rule',
      installName: safeName('my-rule'),
      type: 'rule',
      description: 'A test rule',
    });
    const mockProvider = createMockProvider([skillCog, ruleCog]);

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo', {
      cognitiveType: 'rule',
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.total).toBe(1);
    expect(result.value.results).toHaveLength(1);

    const first = result.value.results[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.name).toBe('my-rule');
      expect(first.cognitiveType).toBe('rule');
    }
  });

  it('applies limit', async () => {
    const cognitives = [
      createMockRemoteCognitive({
        name: 'skill-1',
        installName: safeName('skill-1'),
      }),
      createMockRemoteCognitive({
        name: 'skill-2',
        installName: safeName('skill-2'),
      }),
      createMockRemoteCognitive({
        name: 'skill-3',
        installName: safeName('skill-3'),
      }),
    ];
    const mockProvider = createMockProvider(cognitives);

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo', {
      limit: 2,
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.total).toBe(3);
    expect(result.value.results).toHaveLength(2);
  });

  it('emits operation events', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({ eventBus });

    const op = new FindOperation(ctx);
    await op.execute('https://github.com/owner/repo');

    const startEvents = eventBus.events.filter(
      (e) => e.event === 'operation:start',
    );
    const completeEvents = eventBus.events.filter(
      (e) => e.event === 'operation:complete',
    );

    expect(startEvents).toHaveLength(1);
    expect(completeEvents).toHaveLength(1);

    const startPayload = startEvents[0]?.payload as Record<string, unknown>;
    expect(startPayload['operation']).toBe('find');

    const completePayload = completeEvents[0]?.payload as Record<
      string,
      unknown
    >;
    expect(completePayload['operation']).toBe('find');
    expect(typeof completePayload['durationMs']).toBe('number');
  });

  it('returns err() on unexpected error', async () => {
    ctx = createMockContext({
      sourceParser: {
        parse: () => {
          throw new Error('Invalid source format');
        },
        getOwnerRepo: () => undefined,
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('???bad???');

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error.message).toContain('Invalid source format');
    expect(result.error.code).toBe('OPERATION_ERROR');
  });

  it('returns source in result', async () => {
    const mockProvider = createMockProvider([createMockRemoteCognitive()]);

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new FindOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.source).toBe('https://github.com/owner/repo');
  });
});
