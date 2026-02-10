import { describe, it, expect, beforeEach } from 'vitest';
import type { OperationContext } from '../../src/operations/context.js';
import type { AgentRegistry, AgentType, AgentConfig } from '../../src/types/agent.js';
import type {
  ProviderRegistry,
  SourceParser,
  GitClient,
  SourceDescriptor,
} from '../../src/types/source.js';
import type { DiscoveryService } from '../../src/discovery/index.js';
import type { Installer } from '../../src/types/install.js';
import type { LockManager, LockEntry } from '../../src/types/lock.js';
import type { SDKConfig } from '../../src/types/config.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { sourceIdentifier } from '../../src/types/brands.js';
import { isOk, isErr } from '../../src/types/result.js';
import { RemoveOperation } from '../../src/operations/remove.js';

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

describe('RemoveOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('removes existing cognitives and returns success', async () => {
    const entry = createMockLockEntry();
    let removedFromLock = false;

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => {
          removedFromLock = true;
          return true;
        },
        getEntry: async () => null,
        getAllEntries: async () => ({ 'test-skill': entry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
      installer: {
        install: async (_req, target, _opts) => ({
          success: true,
          agent: target.agent,
          cognitiveName: 'test',
          cognitiveType: 'skill' as const,
          path: '/project/.agents/cognit/skills/general/test',
          mode: target.mode,
        }),
        remove: async () => true,
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['test-skill'], {
      agents: ['cursor' as AgentType],
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.removed).toHaveLength(1);

    const removed = result.value.removed[0];
    expect(removed).toBeDefined();
    if (removed != null) {
      expect(removed.name).toBe('test-skill');
      expect(removed.agents).toContain('cursor');
    }
    expect(result.value.notFound).toHaveLength(0);
    expect(removedFromLock).toBe(true);
  });

  it('reports not found for unknown names', async () => {
    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({}),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['nonexistent-skill']);

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(false);
    expect(result.value.notFound).toContain('nonexistent-skill');
    expect(result.value.removed).toHaveLength(0);
  });

  it('removes from lock even when no agent dirs found', async () => {
    const entry = createMockLockEntry();
    let removedFromLock = false;

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => {
          removedFromLock = true;
          return true;
        },
        getEntry: async () => null,
        getAllEntries: async () => ({ 'test-skill': entry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
      installer: {
        install: async (_req, target, _opts) => ({
          success: true,
          agent: target.agent,
          cognitiveName: 'test',
          cognitiveType: 'skill' as const,
          path: '/project/.agents/cognit/skills/general/test',
          mode: target.mode,
        }),
        remove: async () => false,
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['test-skill'], {
      agents: ['cursor' as AgentType],
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.removed).toHaveLength(1);

    const removed = result.value.removed[0];
    expect(removed).toBeDefined();
    if (removed != null) {
      expect(removed.agents).toHaveLength(0);
    }
    expect(removedFromLock).toBe(true);
  });

  it('handles mixed found/not-found names', async () => {
    const entry = createMockLockEntry();

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({ 'found-skill': entry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['found-skill', 'missing-skill'], {
      agents: ['cursor' as AgentType],
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.removed).toHaveLength(1);
    expect(result.value.notFound).toContain('missing-skill');

    const removed = result.value.removed[0];
    expect(removed).toBeDefined();
    if (removed != null) {
      expect(removed.name).toBe('found-skill');
    }
  });

  it('emits operation:start and operation:complete events', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({ eventBus });

    const op = new RemoveOperation(ctx);
    await op.execute(['some-skill']);

    const startEvents = eventBus.events.filter(
      (e) => e.event === 'operation:start',
    );
    const completeEvents = eventBus.events.filter(
      (e) => e.event === 'operation:complete',
    );

    expect(startEvents).toHaveLength(1);
    expect(completeEvents).toHaveLength(1);

    const startPayload = startEvents[0]?.payload as Record<string, unknown>;
    expect(startPayload['operation']).toBe('remove');

    const completePayload = completeEvents[0]?.payload as Record<
      string,
      unknown
    >;
    expect(completePayload['operation']).toBe('remove');
    expect(typeof completePayload['durationMs']).toBe('number');
  });

  it('falls back to all agents when none specified', async () => {
    const entry = createMockLockEntry();
    const removedForAgents: string[] = [];

    const agentMap = new Map<AgentType, AgentConfig>();
    agentMap.set('cursor' as AgentType, {
      name: 'cursor' as never,
      displayName: 'Cursor',
      dirs: {
        skill: { local: '.cursor/skills', global: undefined },
        agent: { local: '.cursor/agents', global: undefined },
        prompt: { local: '.cursor/prompts', global: undefined },
        rule: { local: '.cursor/rules', global: undefined },
      },
      detectInstalled: async () => true,
      showInUniversalList: false,
    });

    ctx = createMockContext({
      agentRegistry: {
        getAll: () => agentMap,
        get: () => undefined,
        getUniversalAgents: () => [],
        getNonUniversalAgents: () => [],
        isUniversal: () => false,
        getDir: () => undefined,
        detectInstalled: async () => [],
        register: () => {},
      },
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({ 'test-skill': entry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
      installer: {
        install: async (_req, target, _opts) => ({
          success: true,
          agent: target.agent,
          cognitiveName: 'test',
          cognitiveType: 'skill' as const,
          path: '/project/.agents/cognit/skills/general/test',
          mode: target.mode,
        }),
        remove: async (_name, _type, target) => {
          removedForAgents.push(target.agent);
          return true;
        },
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['test-skill']);

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(removedForAgents).toContain('cursor');
  });

  it('returns err() on unexpected error', async () => {
    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => {
          throw new Error('Lock file corrupted');
        },
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new RemoveOperation(ctx);
    const result = await op.execute(['test-skill']);

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error.message).toContain('Lock file corrupted');
    expect(result.error.code).toBe('OPERATION_ERROR');
  });

  it('emits operation:error event when run fails', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({
      eventBus,
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => {
          throw new Error('Unexpected');
        },
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new RemoveOperation(ctx);
    await op.execute(['test-skill']);

    const errorEvents = eventBus.events.filter(
      (e) => e.event === 'operation:error',
    );
    expect(errorEvents).toHaveLength(1);

    const errorPayload = errorEvents[0]?.payload as Record<string, unknown>;
    expect(errorPayload['operation']).toBe('remove');
  });
});
