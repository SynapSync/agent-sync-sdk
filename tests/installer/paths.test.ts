import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import {
  getCanonicalPath,
  getAgentInstallPath,
  findProjectRoot,
} from '../../src/installer/paths.js';
import type { AgentRegistry } from '../../src/types/agent.js';
import type { CognitiveType } from '../../src/types/cognitive.js';

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

describe('getCanonicalPath()', () => {
  it('returns project-scoped path with .agents/cognit prefix', () => {
    const result = getCanonicalPath('skill', 'general', 'my-skill', 'project', '/my-project');
    expect(result).toContain('/my-project/.agents/cognit/skills/general/my-skill');
  });

  it('returns global-scoped path using home directory', () => {
    const result = getCanonicalPath('agent', 'general', 'test-agent', 'global');
    // Global path should contain the type subdir 'agents'
    expect(result).toContain('agents');
    expect(result).toContain('general');
    expect(result).toContain('test-agent');
  });

  it('throws when projectRoot is missing for project scope', () => {
    expect(() => {
      getCanonicalPath('skill', 'general', 'my-skill', 'project');
    }).toThrow('projectRoot is required for project scope');
  });

  it('sanitizes the category and name', () => {
    const result = getCanonicalPath('skill', 'My Category!', 'MY SKILL!', 'project', '/proj');
    expect(result).toContain('my-category');
    expect(result).toContain('my-skill');
  });
});

describe('getAgentInstallPath()', () => {
  it('returns the joined agent dir + sanitized name when dir is configured', () => {
    const registry = createMockAgentRegistry({
      getDir: () => '/project/.cursor/rules',
    });
    const result = getAgentInstallPath('cursor', 'skill', 'My Skill', 'project', registry);
    expect(result).toBe('/project/.cursor/rules/my-skill');
  });

  it('returns undefined when no dir is configured', () => {
    const registry = createMockAgentRegistry({
      getDir: () => undefined,
    });
    const result = getAgentInstallPath('cursor', 'skill', 'test', 'project', registry);
    expect(result).toBeUndefined();
  });
});

describe('findProjectRoot()', () => {
  it('finds a directory with .git', async () => {
    const memFs = createMemoryFs({
      '/projects/myapp/.git/config': '',
    });
    const result = await findProjectRoot('/projects/myapp/src/components', memFs);
    expect(result).toBe('/projects/myapp');
  });

  it('finds a directory with package.json', async () => {
    const memFs = createMemoryFs({
      '/projects/myapp/package.json': '{}',
    });
    const result = await findProjectRoot('/projects/myapp/src', memFs);
    expect(result).toBe('/projects/myapp');
  });

  it('returns undefined when no markers are found', async () => {
    const memFs = createMemoryFs();
    const result = await findProjectRoot('/some/deep/path', memFs);
    expect(result).toBeUndefined();
  });
});
