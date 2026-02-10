import { describe, it, expect, beforeEach } from 'vitest';
import type { OperationContext } from '../../src/operations/context.js';
import type { AgentRegistry } from '../../src/types/agent.js';
import type { ProviderRegistry, SourceParser, GitClient, SourceDescriptor } from '../../src/types/source.js';
import type { DiscoveryService } from '../../src/discovery/index.js';
import type { Installer } from '../../src/types/install.js';
import type { LockManager, LockEntry } from '../../src/types/lock.js';
import type { SDKConfig } from '../../src/types/config.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { sourceIdentifier } from '../../src/types/brands.js';
import { isOk, isErr } from '../../src/types/result.js';
import { computeContentHash } from '../../src/lock/integrity.js';
import { SyncOperation } from '../../src/operations/sync.js';

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

const skillContent = '# Test Skill Content';
const skillHash = computeContentHash(skillContent);

// The canonical path for a skill named "test-skill" is:
// /project/.agents/cognit/skills/general/test-skill
// verifyContentHash reads the file at that path directly, so we seed the canonical path as a FILE.
const canonicalPath = '/project/.agents/cognit/skills/general/test-skill';

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

describe('SyncOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('reports all in sync when paths exist and hashes match', async () => {
    const fs = createMemoryFs({
      [canonicalPath]: skillContent,
    });

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(0);
    expect(result.value.success).toBe(true);
    expect(result.value.message).toBe('All cognitives are in sync');
  });

  it('detects missing files', async () => {
    // Do NOT seed the canonical path so it does not exist
    const fs = createMemoryFs();

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.type).toBe('missing_files');
    expect(result.value.issues[0]!.name).toBe('test-skill');
    expect(result.value.issues[0]!.description).toContain('does not exist');
  });

  it('detects hash mismatch', async () => {
    // Seed the path with DIFFERENT content so hash won't match
    const fs = createMemoryFs({
      [canonicalPath]: '# Different Content',
    });

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.type).toBe('lock_mismatch');
    expect(result.value.issues[0]!.name).toBe('test-skill');
    expect(result.value.issues[0]!.description).toContain('hash mismatch');
  });

  it('dry run mode reports issues but marks fixed=false', async () => {
    const fs = createMemoryFs();

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute({ dryRun: true });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.fixed).toBe(false);
    expect(result.value.message).toContain('dry run');
  });

  it('confirmed mode marks issues as fixed=true', async () => {
    const fs = createMemoryFs();

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute({ confirmed: true });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.fixed).toBe(true);
    expect(result.value.fixed).toBe(1);
    expect(result.value.remaining).toBe(0);
  });

  it('emits operation events', async () => {
    ctx = createMockContext();

    const op = new SyncOperation(ctx);
    await op.execute();

    const bus = ctx.eventBus as ReturnType<typeof createCapturingEventBus>;
    const events = bus.events;

    const startEvent = events.find((e) => e.event === 'operation:start');
    const completeEvent = events.find((e) => e.event === 'operation:complete');

    expect(startEvent).toBeDefined();
    expect((startEvent!.payload as Record<string, unknown>)['operation']).toBe('sync');
    expect(completeEvent).toBeDefined();
    expect((completeEvent!.payload as Record<string, unknown>)['operation']).toBe('sync');
  });

  it('returns err() on unexpected error', async () => {
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => { throw new Error('Storage unavailable'); },
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute();

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.message).toBe('Sync operation failed');
  });

  it('handles multiple entries with mixed status', async () => {
    const otherContent = '# Other Skill';
    const otherHash = computeContentHash(otherContent);
    const otherCanonical = '/project/.agents/cognit/skills/general/other-skill';

    // test-skill exists with matching hash, other-skill is missing
    const fs = createMemoryFs({
      [canonicalPath]: skillContent,
    });

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
          'other-skill': makeLockEntry(otherHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new SyncOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    // Only other-skill should have an issue (missing)
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.name).toBe('other-skill');
    expect(result.value.issues[0]!.type).toBe('missing_files');
  });
});
