import { describe, it, expect, beforeEach } from 'vitest';
import type { OperationContext } from '../../src/operations/context.js';
import type { AgentRegistry } from '../../src/types/agent.js';
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
import { computeContentHash } from '../../src/lock/integrity.js';
import { CheckOperation } from '../../src/operations/check.js';

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

const skillContent = '# Check Skill Content';
const skillHash = computeContentHash(skillContent);
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

describe('CheckOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('all healthy when paths exist and hashes match', async () => {
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

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.healthy).toContain('test-skill');
    expect(result.value.issues).toHaveLength(0);
    expect(result.value.success).toBe(true);
    expect(result.value.message).toContain('healthy');
  });

  it('detects missing canonical paths with severity error', async () => {
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

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.type).toBe('missing_canonical');
    expect(result.value.issues[0]!.severity).toBe('error');
    expect(result.value.issues[0]!.name).toBe('test-skill');
    expect(result.value.healthy).toHaveLength(0);
  });

  it('detects hash mismatch with severity warning', async () => {
    const fs = createMemoryFs({
      [canonicalPath]: '# Completely Different Content',
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

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.issues).toHaveLength(1);
    expect(result.value.issues[0]!.type).toBe('hash_mismatch');
    expect(result.value.issues[0]!.severity).toBe('warning');
    expect(result.value.issues[0]!.name).toBe('test-skill');
    expect(result.value.healthy).toHaveLength(0);
  });

  it('builds message correctly with mixed healthy and issues', async () => {
    const secondContent = '# Second Skill';
    const secondHash = computeContentHash(secondContent);
    const secondPath = '/project/.agents/cognit/skills/general/second-skill';

    // test-skill is missing, second-skill is healthy, third-skill has hash mismatch
    const thirdContent = '# Third Skill';
    const thirdHash = computeContentHash(thirdContent);
    const thirdPath = '/project/.agents/cognit/skills/general/third-skill';

    const fs = createMemoryFs({
      [secondPath]: secondContent,
      [thirdPath]: '# Modified Third Skill',
    });

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'test-skill': makeLockEntry(skillHash),
          'second-skill': makeLockEntry(secondHash),
          'third-skill': makeLockEntry(thirdHash),
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.healthy).toHaveLength(1);
    expect(result.value.healthy).toContain('second-skill');
    expect(result.value.issues).toHaveLength(2);

    // Message should contain counts
    expect(result.value.message).toContain('1 healthy');
    expect(result.value.message).toContain('1 error(s)');
    expect(result.value.message).toContain('1 warning(s)');
  });

  it('emits operation events', async () => {
    ctx = createMockContext();

    const op = new CheckOperation(ctx);
    await op.execute();

    const bus = ctx.eventBus as ReturnType<typeof createCapturingEventBus>;
    const events = bus.events;

    const startEvent = events.find((e) => e.event === 'operation:start');
    const completeEvent = events.find((e) => e.event === 'operation:complete');

    expect(startEvent).toBeDefined();
    expect((startEvent!.payload as Record<string, unknown>)['operation']).toBe('check');
    expect(completeEvent).toBeDefined();
    expect((completeEvent!.payload as Record<string, unknown>)['operation']).toBe('check');
  });

  it('returns err() on unexpected error', async () => {
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => {
          throw new Error('Lock file corrupted');
        },
      },
    });

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.message).toBe('Lock file corrupted');
  });

  it('reports all healthy message when no issues', async () => {
    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({}),
      },
    });

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.success).toBe(true);
    expect(result.value.message).toContain('healthy');
  });

  it('handles prompt cognitive type with correct subdir', async () => {
    const promptContent = '# My Prompt';
    const promptHash = computeContentHash(promptContent);
    const promptPath = '/project/.agents/cognit/prompts/general/my-prompt';

    const fs = createMemoryFs({
      [promptPath]: promptContent,
    });

    const promptEntry: LockEntry = {
      source: sourceIdentifier('owner/prompts-repo'),
      sourceType: 'remote',
      sourceUrl: 'https://github.com/owner/prompts-repo',
      contentHash: promptHash,
      cognitiveType: 'prompt',
      installedAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ctx = createMockContext({
      lockManager: {
        ...ctx.lockManager,
        getAllEntries: async () => ({
          'my-prompt': promptEntry,
        }),
      },
      config: {
        ...ctx.config,
        fs,
      },
    });

    const op = new CheckOperation(ctx);
    const result = await op.execute();

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.healthy).toContain('my-prompt');
    expect(result.value.issues).toHaveLength(0);
  });
});
