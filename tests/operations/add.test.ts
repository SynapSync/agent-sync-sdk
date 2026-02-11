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
import type { Installer, InstallResult } from '../../src/types/install.js';
import type { LockManager, LockEntry } from '../../src/types/lock.js';
import type { SDKConfig } from '../../src/types/config.js';
import type { RemoteCognitive, Cognitive } from '../../src/types/cognitive.js';
import type { CognitiveName } from '../../src/types/brands.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { safeName, sourceIdentifier, cognitiveName } from '../../src/types/brands.js';
import { isOk, isErr } from '../../src/types/result.js';
import { AddOperation } from '../../src/operations/add.js';

function createMockContext(overrides?: Partial<OperationContext>): OperationContext {
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

function createMockRemoteCognitive(overrides?: Partial<RemoteCognitive>): RemoteCognitive {
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

describe('AddOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('returns available cognitives when not confirmed', async () => {
    const mockProvider = createMockProvider();
    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.installed).toHaveLength(0);
    expect(result.value.available).toBeDefined();
    expect(result.value.available).toHaveLength(1);

    const first = result.value.available?.[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.name).toBe('test-skill');
      expect(first.cognitiveType).toBe('skill');
    }
  });

  it('returns "no cognitives found" when source yields nothing', async () => {
    const emptyProvider = createMockProvider([]);
    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => emptyProvider,
        getAll: () => [emptyProvider],
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/empty');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(false);
    expect(result.value.installed).toHaveLength(0);
    expect(result.value.message).toContain('No cognitives found');
  });

  it('returns "no cognitives matched filters" when filters do not match', async () => {
    const mockProvider = createMockProvider([createMockRemoteCognitive()]);
    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo', {
      cognitiveType: 'rule',
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(false);
    expect(result.value.message).toContain('No cognitives matched');
  });

  it('installs remote cognitives when confirmed with agents', async () => {
    const remoteCog = createMockRemoteCognitive();
    const mockProvider = createMockProvider([remoteCog]);
    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo', {
      confirmed: true,
      agents: ['cursor' as AgentType],
      mode: 'copy',
      scope: 'project',
      category: 'general',
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.installed).toHaveLength(1);

    const installed = result.value.installed[0];
    expect(installed).toBeDefined();
    if (installed != null) {
      expect(installed.name).toBe('test-skill');
      expect(installed.cognitiveType).toBe('skill');
      expect(installed.agents).toHaveLength(1);
    }
  });

  it('records lock entry after successful install', async () => {
    const remoteCog = createMockRemoteCognitive();
    const mockProvider = createMockProvider([remoteCog]);

    let addedName: string | undefined;
    let addedEntry: Omit<LockEntry, 'installedAt' | 'updatedAt'> | undefined;

    const baseMockCtx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
    });

    ctx = createMockContext({
      providerRegistry: baseMockCtx.providerRegistry,
      lockManager: {
        ...baseMockCtx.lockManager,
        addEntry: async (name, entry) => {
          addedName = name;
          addedEntry = entry;
        },
      },
    });

    const op = new AddOperation(ctx);
    await op.execute('https://github.com/owner/repo', {
      confirmed: true,
      agents: ['cursor' as AgentType],
      mode: 'copy',
      scope: 'project',
      category: 'general',
    });

    expect(addedName).toBe('test-skill');
    expect(addedEntry).toBeDefined();
    if (addedEntry != null) {
      expect(addedEntry.source).toBe(sourceIdentifier('owner/repo'));
      expect(addedEntry.sourceType).toBe('remote');
      expect(addedEntry.cognitiveType).toBe('skill');
    }
  });

  it('handles install failure for one agent gracefully', async () => {
    const remoteCog = createMockRemoteCognitive();
    const mockProvider = createMockProvider([remoteCog]);

    ctx = createMockContext({
      providerRegistry: {
        register: () => {},
        findProvider: () => mockProvider,
        getAll: () => [mockProvider],
      },
      installer: {
        install: async () => {
          throw new Error('Disk full');
        },
        remove: async () => true,
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo', {
      confirmed: true,
      agents: ['cursor' as AgentType],
      mode: 'copy',
      scope: 'project',
      category: 'general',
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(false);
    expect(result.value.failed).toHaveLength(1);

    const failedItem = result.value.failed[0];
    expect(failedItem).toBeDefined();
    if (failedItem != null) {
      expect(failedItem.name).toBe('test-skill');
      expect(failedItem.error).toContain('Disk full');
    }
  });

  it('emits operation:start and operation:complete events', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({ eventBus });

    const op = new AddOperation(ctx);
    await op.execute('https://github.com/owner/repo');

    const startEvents = eventBus.events.filter((e) => e.event === 'operation:start');
    const completeEvents = eventBus.events.filter((e) => e.event === 'operation:complete');

    expect(startEvents).toHaveLength(1);
    expect(completeEvents).toHaveLength(1);

    const startPayload = startEvents[0]?.payload as Record<string, unknown>;
    expect(startPayload['operation']).toBe('add');

    const completePayload = completeEvents[0]?.payload as Record<string, unknown>;
    expect(completePayload['operation']).toBe('add');
    expect(typeof completePayload['durationMs']).toBe('number');
  });

  it('returns err() when an unexpected error occurs', async () => {
    ctx = createMockContext({
      sourceParser: {
        parse: () => {
          throw new Error('Parse explosion');
        },
        getOwnerRepo: () => undefined,
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('bad-source');

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error.message).toContain('Parse explosion');
    expect(result.error.code).toBe('OPERATION_ERROR');
  });

  it('uses git clone fallback for git sources when no provider matches', async () => {
    const localCognitive: Cognitive = {
      name: cognitiveName('local-skill'),
      description: 'A local skill',
      path: '/tmp/cloned/skills/local-skill',
      type: 'skill',
      rawContent: '# Local Skill',
      metadata: {},
    };

    let clonedUrl: string | undefined;
    let cleanedUpDir: string | undefined;

    ctx = createMockContext({
      sourceParser: {
        parse: (source: string): SourceDescriptor => ({
          kind: 'github',
          url: source,
        }),
        getOwnerRepo: () => undefined,
      },
      providerRegistry: {
        register: () => {},
        findProvider: () => null,
        getAll: () => [],
      },
      gitClient: {
        clone: async (url) => {
          clonedUrl = url;
          return '/tmp/cloned';
        },
        cleanup: async (dir) => {
          cleanedUpDir = dir;
        },
      },
      discoveryService: {
        discover: async () => [localCognitive],
        discoverByType: async () => [],
      },
    });

    const op = new AddOperation(ctx);
    const result = await op.execute('https://github.com/owner/repo');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.available).toHaveLength(1);
    expect(clonedUrl).toBe('https://github.com/owner/repo');
    expect(cleanedUpDir).toBe('/tmp/cloned');
  });

  it('emits operation:error event when run fails', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({
      eventBus,
      sourceParser: {
        parse: () => {
          throw new Error('Unexpected');
        },
        getOwnerRepo: () => undefined,
      },
    });

    const op = new AddOperation(ctx);
    await op.execute('bad-source');

    const errorEvents = eventBus.events.filter((e) => e.event === 'operation:error');
    expect(errorEvents).toHaveLength(1);

    const errorPayload = errorEvents[0]?.payload as Record<string, unknown>;
    expect(errorPayload['operation']).toBe('add');
  });
});
