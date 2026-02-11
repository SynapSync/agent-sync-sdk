import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { InstallerImpl } from '../../src/installer/service.js';
import { cognitiveName } from '../../src/types/brands.js';
import { safeName, sourceIdentifier } from '../../src/types/brands.js';
import type { AgentRegistry, AgentType } from '../../src/types/agent.js';
import type { FileSystemAdapter } from '../../src/types/config.js';
import type { EventBus } from '../../src/types/events.js';
import type { InstallRequest, InstallTarget, InstallerOptions } from '../../src/types/install.js';

function createMockAgentRegistry(overrides?: Partial<AgentRegistry>): AgentRegistry {
  return {
    getAll: () => new Map(),
    get: () => undefined,
    getUniversalAgents: () => [],
    getNonUniversalAgents: () => [],
    isUniversal: () => false,
    getDir: () => undefined,
    detectInstalled: async () => [],
    register: () => {},
    ...overrides,
  };
}

describe('InstallerImpl', () => {
  let memFs: FileSystemAdapter;
  let eventBus: ReturnType<typeof createCapturingEventBus>;

  beforeEach(() => {
    memFs = createMemoryFs();
    eventBus = createCapturingEventBus();
  });

  const target: InstallTarget = {
    agent: 'cursor' as AgentType,
    scope: 'project',
    mode: 'symlink',
  };

  const options: InstallerOptions = { cwd: '/project' };

  describe('install()', () => {
    it('installs a local cognitive to canonical path', async () => {
      // Set up source files
      const seededFs = createMemoryFs({
        '/source/test-skill/SKILL.md': '# Test Skill',
      });

      const registry = createMockAgentRegistry({
        isUniversal: () => true,
      });

      const installer = new InstallerImpl(registry, seededFs, eventBus);

      const request: InstallRequest = {
        kind: 'local',
        cognitive: {
          name: cognitiveName('test-skill'),
          description: 'A test skill',
          path: '/source/test-skill',
          type: 'skill',
          rawContent: '# Test Skill',
          metadata: {},
        },
      };

      const result = await installer.install(request, target, options);

      expect(result.success).toBe(true);
      expect(result.cognitiveName).toBe('test-skill');
      expect(result.cognitiveType).toBe('skill');
      expect(result.agent).toBe('cursor');
    });

    it('installs a remote cognitive by writing content file', async () => {
      const registry = createMockAgentRegistry({
        isUniversal: () => true,
      });

      const installer = new InstallerImpl(registry, memFs, eventBus);

      const request: InstallRequest = {
        kind: 'remote',
        cognitive: {
          name: 'remote-skill',
          description: 'Remote skill',
          content: '# Remote Skill Content',
          installName: safeName('remote-skill'),
          sourceUrl: 'https://github.com/owner/repo',
          providerId: 'github',
          sourceIdentifier: sourceIdentifier('owner/repo'),
          type: 'skill',
          metadata: {},
        },
      };

      const result = await installer.install(request, target, options);

      expect(result.success).toBe(true);
      expect(result.cognitiveName).toBe('remote-skill');
      // Verify the file was written to canonical path
      const canonicalPath = result.canonicalPath ?? result.path;
      const content = await memFs.readFile(`${canonicalPath}/SKILL.md`, 'utf-8');
      expect(content).toBe('# Remote Skill Content');
    });

    it('installs a wellknown cognitive with multiple files', async () => {
      const registry = createMockAgentRegistry({
        isUniversal: () => true,
      });

      const installer = new InstallerImpl(registry, memFs, eventBus);

      const files = new Map<string, string>([
        ['SKILL.md', '# WellKnown Skill'],
        ['config.json', '{"key": "value"}'],
      ]);

      const request: InstallRequest = {
        kind: 'wellknown',
        cognitive: {
          name: 'wellknown-skill',
          installName: safeName('wellknown-skill'),
          description: 'A wellknown skill',
          type: 'skill',
          sourceUrl: 'https://example.com',
          files,
          metadata: {},
        },
      };

      const result = await installer.install(request, target, options);

      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      const canonicalPath = result.canonicalPath ?? result.path;
      const skillContent = await memFs.readFile(`${canonicalPath}/SKILL.md`, 'utf-8');
      expect(skillContent).toBe('# WellKnown Skill');
      const configContent = await memFs.readFile(`${canonicalPath}/config.json`, 'utf-8');
      expect(configContent).toBe('{"key": "value"}');
    });

    it('uses copy mode for non-universal agents', async () => {
      const seededFs = createMemoryFs({
        '/source/test-skill/SKILL.md': '# Test Skill',
      });

      const registry = createMockAgentRegistry({
        isUniversal: () => false,
        getDir: () => '/project/.cursor/rules',
      });

      const copyTarget: InstallTarget = {
        agent: 'cursor' as AgentType,
        scope: 'project',
        mode: 'copy',
      };

      const installer = new InstallerImpl(registry, seededFs, eventBus);

      const request: InstallRequest = {
        kind: 'local',
        cognitive: {
          name: cognitiveName('test-skill'),
          description: 'A test skill',
          path: '/source/test-skill',
          type: 'skill',
          rawContent: '# Test Skill',
          metadata: {},
        },
      };

      const result = await installer.install(request, copyTarget, options);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('copy');
      // Should have emitted install:copy event
      const copyEvents = eventBus.events.filter((e) => e.event === 'install:copy');
      expect(copyEvents.length).toBeGreaterThan(0);
    });

    it('falls back to copy when symlink fails', async () => {
      // Create an fs where symlink always throws
      const baseFs = createMemoryFs({
        '/source/test-skill/SKILL.md': '# Test Skill',
      }) as FileSystemAdapter;
      const failSymlinkFs: FileSystemAdapter = {
        readFile: (p, e) => baseFs.readFile(p, e),
        writeFile: (p, c, e) => baseFs.writeFile(p, c, e),
        mkdir: (p, o) => baseFs.mkdir(p, o),
        readdir: (p, o) => baseFs.readdir(p, o),
        stat: (p) => baseFs.stat(p),
        lstat: (p) => baseFs.lstat(p),
        readlink: (p) => baseFs.readlink(p),
        rm: (p, o) => baseFs.rm(p, o),
        rename: (o, n) => baseFs.rename(o, n),
        exists: (p) => baseFs.exists(p),
        copyDirectory: (s, t) => baseFs.copyDirectory(s, t),
        symlink: async () => {
          throw new Error('symlink not supported');
        },
      };

      const registry = createMockAgentRegistry({
        isUniversal: () => false,
        getDir: () => '/project/.cursor/rules',
      });

      const installer = new InstallerImpl(registry, failSymlinkFs, eventBus);

      const request: InstallRequest = {
        kind: 'local',
        cognitive: {
          name: cognitiveName('test-skill'),
          description: 'A test skill',
          path: '/source/test-skill',
          type: 'skill',
          rawContent: '# Test Skill',
          metadata: {},
        },
      };

      const result = await installer.install(request, target, options);

      expect(result.success).toBe(true);
      expect(result.symlinkFailed).toBe(true);
    });

    it('emits install:start and install:complete events', async () => {
      const registry = createMockAgentRegistry({
        isUniversal: () => true,
      });

      const installer = new InstallerImpl(registry, memFs, eventBus);

      const request: InstallRequest = {
        kind: 'remote',
        cognitive: {
          name: 'event-skill',
          description: 'Event test',
          content: '# Event Skill',
          installName: safeName('event-skill'),
          sourceUrl: 'https://example.com',
          providerId: 'github',
          sourceIdentifier: sourceIdentifier('owner/repo'),
          type: 'skill',
          metadata: {},
        },
      };

      await installer.install(request, target, options);

      const startEvents = eventBus.events.filter((e) => e.event === 'install:start');
      const completeEvents = eventBus.events.filter((e) => e.event === 'install:complete');
      expect(startEvents.length).toBe(1);
      expect(completeEvents.length).toBe(1);
    });
  });

  describe('remove()', () => {
    it('removes an existing cognitive and returns true', async () => {
      const seededFs = createMemoryFs({
        '/project/.cursor/rules/test-skill/SKILL.md': '# Test',
      });

      const registry = createMockAgentRegistry({
        getDir: () => '/project/.cursor/rules',
      });

      const installer = new InstallerImpl(registry, seededFs, eventBus);

      const result = await installer.remove('test-skill', 'skill', target);
      expect(result).toBe(true);
      expect(await seededFs.exists('/project/.cursor/rules/test-skill')).toBe(false);
    });

    it('returns false for a non-existent cognitive', async () => {
      const registry = createMockAgentRegistry({
        getDir: () => '/project/.cursor/rules',
      });

      const installer = new InstallerImpl(registry, memFs, eventBus);

      const result = await installer.remove('nonexistent', 'skill', target);
      expect(result).toBe(false);
    });
  });
});
