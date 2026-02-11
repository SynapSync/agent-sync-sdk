import { describe, it, expect } from 'vitest';
import { shouldSkipSymlink, getAgentSymlinkPaths } from '../../src/installer/flatten.js';
import type { AgentRegistry } from '../../src/types/agent.js';
import type { AgentType } from '../../src/types/agent.js';
import type { CognitiveType } from '../../src/types/cognitive.js';
import type { InstallScope } from '../../src/types/install.js';

/**
 * Minimal mock registry.
 * - 'codex' is universal for all cognitive types
 * - 'claude-code' and 'cursor' are non-universal, with directory configs
 */
function createMockRegistry(): AgentRegistry {
  return {
    isUniversal(type: AgentType, _cognitiveType?: CognitiveType): boolean {
      return type === ('codex' as AgentType);
    },
    getDir(
      type: AgentType,
      cognitiveType: CognitiveType,
      scope: 'local' | 'global',
    ): string | undefined {
      if (type === ('codex' as AgentType)) return undefined;
      const base = scope === 'local' ? '/project/.agents' : '/home/.agents';
      return `${base}/${type}/${cognitiveType}s`;
    },
    getAll: () => new Map(),
    get: () => undefined,
    getUniversalAgents: () => [],
    getNonUniversalAgents: () => [],
    detectInstalled: async () => [],
    register: () => {},
  } as unknown as AgentRegistry;
}

describe('shouldSkipSymlink()', () => {
  const registry = createMockRegistry();

  it('returns true for universal agent', () => {
    expect(shouldSkipSymlink('codex' as AgentType, 'skill', registry)).toBe(true);
  });

  it('returns false for non-universal agent', () => {
    expect(shouldSkipSymlink('claude-code' as AgentType, 'skill', registry)).toBe(false);
  });
});

describe('getAgentSymlinkPaths()', () => {
  const registry = createMockRegistry();

  it('returns empty array when all agents are universal', () => {
    const result = getAgentSymlinkPaths(
      '/canonical/skills/my-skill',
      'my-skill',
      'skill',
      ['codex' as AgentType],
      'project' as InstallScope,
      registry,
    );
    expect(result).toEqual([]);
  });

  it('returns paths for non-universal agents', () => {
    const result = getAgentSymlinkPaths(
      '/canonical/skills/my-skill',
      'my-skill',
      'skill',
      ['claude-code' as AgentType],
      'project' as InstallScope,
      registry,
    );
    expect(result.length).toBe(1);
    expect(result[0]!.agentType).toBe('claude-code');
    expect(result[0]!.agentPath).toBeDefined();
    expect(result[0]!.agentPath).not.toBe('/canonical/skills/my-skill');
  });

  it('excludes universal agents from results', () => {
    const result = getAgentSymlinkPaths(
      '/canonical/skills/my-skill',
      'my-skill',
      'skill',
      ['codex' as AgentType, 'claude-code' as AgentType],
      'project' as InstallScope,
      registry,
    );
    const agentTypes = result.map((r) => r.agentType);
    expect(agentTypes).not.toContain('codex');
    expect(agentTypes).toContain('claude-code');
  });

  it('excludes entries where agentPath equals canonicalPath', () => {
    // Create a registry that returns canonicalPath for a specific agent
    const specialRegistry: AgentRegistry = {
      ...createMockRegistry(),
      isUniversal: () => false,
      getDir(_type: AgentType, _cognitiveType: CognitiveType, _scope: 'local' | 'global') {
        // Return a dir that, when combined with the name, yields the canonical path's parent
        return '/canonical/skills';
      },
    } as unknown as AgentRegistry;

    const result = getAgentSymlinkPaths(
      '/canonical/skills/my-skill',
      'my-skill',
      'skill',
      ['cursor' as AgentType],
      'project' as InstallScope,
      specialRegistry,
    );
    // agentPath would be /canonical/skills/my-skill which equals canonicalPath
    expect(result).toEqual([]);
  });

  it('handles multiple non-universal agents', () => {
    const result = getAgentSymlinkPaths(
      '/canonical/skills/my-skill',
      'my-skill',
      'skill',
      ['claude-code' as AgentType, 'cursor' as AgentType],
      'project' as InstallScope,
      registry,
    );
    expect(result.length).toBe(2);
    const types = result.map((r) => r.agentType);
    expect(types).toContain('claude-code');
    expect(types).toContain('cursor');
  });
});
