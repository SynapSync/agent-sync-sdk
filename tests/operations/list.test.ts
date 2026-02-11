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
import { ListOperation } from '../../src/operations/list.js';

function createMockLockEntry(overrides?: Partial<LockEntry>): LockEntry {
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

describe('ListOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('returns empty list when no cognitives installed', async () => {
    const op = new ListOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.cognitives).toHaveLength(0);
    expect(result.value.count).toBe(0);
    expect(result.value.message).toContain('No cognitives installed');
  });

  it('returns all installed cognitives sorted by name', async () => {
    const entryA = createMockLockEntry({ contentHash: 'hash-a' });
    const entryB = createMockLockEntry({
      cognitiveType: 'rule',
      contentHash: 'hash-b',
    });

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({
          'zeta-rule': entryB,
          'alpha-skill': entryA,
        }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new ListOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.success).toBe(true);
    expect(result.value.count).toBe(2);
    expect(result.value.cognitives).toHaveLength(2);

    const first = result.value.cognitives[0];
    const second = result.value.cognitives[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first != null && second != null) {
      expect(first.name).toBe('alpha-skill');
      expect(second.name).toBe('zeta-rule');
    }
  });

  it('filters by cognitiveType', async () => {
    const skillEntry = createMockLockEntry({ cognitiveType: 'skill' });
    const ruleEntry = createMockLockEntry({ cognitiveType: 'rule' });

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({
          'my-skill': skillEntry,
          'my-rule': ruleEntry,
        }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new ListOperation(ctx);
    const result = await op.execute({ cognitiveType: 'rule' });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.count).toBe(1);
    expect(result.value.cognitives).toHaveLength(1);

    const first = result.value.cognitives[0];
    expect(first).toBeDefined();
    if (first != null) {
      expect(first.name).toBe('my-rule');
      expect(first.cognitiveType).toBe('rule');
    }
  });

  it('emits operation events', async () => {
    const eventBus = createCapturingEventBus();
    ctx = createMockContext({ eventBus });

    const op = new ListOperation(ctx);
    await op.execute();

    const startEvents = eventBus.events.filter((e) => e.event === 'operation:start');
    const completeEvents = eventBus.events.filter((e) => e.event === 'operation:complete');

    expect(startEvents).toHaveLength(1);
    expect(completeEvents).toHaveLength(1);

    const startPayload = startEvents[0]?.payload as Record<string, unknown>;
    expect(startPayload['operation']).toBe('list');

    const completePayload = completeEvents[0]?.payload as Record<string, unknown>;
    expect(completePayload['operation']).toBe('list');
    expect(typeof completePayload['durationMs']).toBe('number');
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
          throw new Error('Disk read failure');
        },
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new ListOperation(ctx);
    const result = await op.execute();

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;

    expect(result.error.message).toContain('Disk read failure');
    expect(result.error.code).toBe('OPERATION_ERROR');
  });

  it('includes correct metadata fields in listed cognitives', async () => {
    const entry = createMockLockEntry({
      contentHash: 'sha256-deadbeef',
      sourceUrl: 'https://github.com/org/repo',
      installedAt: '2024-06-15T10:30:00.000Z',
      updatedAt: '2024-06-16T12:00:00.000Z',
    });

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({ 'detailed-skill': entry }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new ListOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.cognitives).toHaveLength(1);

    const cog = result.value.cognitives[0];
    expect(cog).toBeDefined();
    if (cog != null) {
      expect(cog.name).toBe('detailed-skill');
      expect(cog.contentHash).toBe('sha256-deadbeef');
      expect(cog.sourceUrl).toBe('https://github.com/org/repo');
      expect(cog.installedAt).toBe('2024-06-15T10:30:00.000Z');
      expect(cog.updatedAt).toBe('2024-06-16T12:00:00.000Z');
    }
  });

  it('returns message with count when cognitives exist', async () => {
    const entry = createMockLockEntry();

    ctx = createMockContext({
      lockManager: {
        read: async () => ({ version: 5 as const, cognitives: {} }),
        write: async () => {},
        addEntry: async () => {},
        removeEntry: async () => true,
        getEntry: async () => null,
        getAllEntries: async () => ({
          'skill-one': entry,
          'skill-two': entry,
        }),
        getBySource: async () => new Map(),
        getLastSelectedAgents: async () => undefined,
        saveLastSelectedAgents: async () => {},
      },
    });

    const op = new ListOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    expect(result.value.message).toContain('Found 2 installed cognitive(s)');
  });
});
