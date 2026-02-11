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
import type { LockManager } from '../../src/types/lock.js';
import type { SDKConfig } from '../../src/types/config.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { isOk, isErr } from '../../src/types/result.js';
import { InitOperation } from '../../src/operations/init.js';

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

describe('InitOperation', () => {
  let ctx: OperationContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('creates a skill directory with SKILL.md template', async () => {
    const op = new InitOperation(ctx);
    const result = await op.execute('my-skill', 'skill');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.success).toBe(true);
    expect(result.value.cognitiveType).toBe('skill');
    expect(result.value.path).toBe('/project/my-skill');
    expect(result.value.files).toHaveLength(1);
    expect(result.value.files[0]).toContain('SKILL.md');

    // Verify the file was actually written
    const content = await ctx.config.fs.readFile(result.value.files[0]!, 'utf-8');
    expect(content).toContain('name: my-skill');
    expect(content).toContain('---');
    expect(content).toContain('# my-skill');
  });

  it('creates a prompt directory with PROMPT.md template', async () => {
    const op = new InitOperation(ctx);
    const result = await op.execute('my-prompt', 'prompt');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.cognitiveType).toBe('prompt');
    expect(result.value.files[0]).toContain('PROMPT.md');

    const content = await ctx.config.fs.readFile(result.value.files[0]!, 'utf-8');
    expect(content).toContain('name: my-prompt');
  });

  it('creates a rule directory with RULE.md template', async () => {
    const op = new InitOperation(ctx);
    const result = await op.execute('my-rule', 'rule');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.cognitiveType).toBe('rule');
    expect(result.value.files[0]).toContain('RULE.md');

    const content = await ctx.config.fs.readFile(result.value.files[0]!, 'utf-8');
    expect(content).toContain('name: my-rule');
  });

  it('returns error when directory already exists', async () => {
    // Pre-create the directory
    await ctx.config.fs.mkdir('/project/existing-skill', { recursive: true });

    const op = new InitOperation(ctx);
    const result = await op.execute('existing-skill', 'skill');

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) return;
    expect(result.error.message).toContain('already exists');
  });

  it('uses custom outputDir when provided', async () => {
    const op = new InitOperation(ctx);
    const result = await op.execute('custom-skill', 'skill', { outputDir: '/custom/output' });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    expect(result.value.path).toBe('/custom/output/custom-skill');
    expect(result.value.files[0]).toContain('/custom/output/custom-skill/SKILL.md');
  });

  it('sanitizes the name correctly', async () => {
    const op = new InitOperation(ctx);
    // Name with uppercase and spaces should be sanitized to kebab-case
    const result = await op.execute('My Cool Skill', 'skill');

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;
    // sanitizeName converts to lowercase and replaces non-alphanumeric with hyphens
    expect(result.value.path).toBe('/project/my-cool-skill');
    expect(result.value.message).toContain('my-cool-skill');
  });

  it('emits operation events', async () => {
    const op = new InitOperation(ctx);
    await op.execute('event-test', 'skill');

    const bus = ctx.eventBus as ReturnType<typeof createCapturingEventBus>;
    const events = bus.events;

    const startEvent = events.find((e) => e.event === 'operation:start');
    const completeEvent = events.find((e) => e.event === 'operation:complete');

    expect(startEvent).toBeDefined();
    expect((startEvent!.payload as Record<string, unknown>)['operation']).toBe('init');
    expect(completeEvent).toBeDefined();
    expect((completeEvent!.payload as Record<string, unknown>)['operation']).toBe('init');
  });

  it('uses custom description in template when provided', async () => {
    const op = new InitOperation(ctx);
    const result = await op.execute('desc-skill', 'skill', {
      description: 'A custom description',
    });

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) return;

    const content = await ctx.config.fs.readFile(result.value.files[0]!, 'utf-8');
    expect(content).toContain('description: A custom description');
  });
});
