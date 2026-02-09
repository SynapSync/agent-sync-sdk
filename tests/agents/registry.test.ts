import { describe, it, expect } from 'vitest';
import { AgentRegistryImpl } from '../../src/agents/registry.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { resolveConfig } from '../../src/config/index.js';
import { agentName } from '../../src/types/brands.js';
import type { AgentConfig } from '../../src/types/agent.js';
import type { CognitiveType } from '../../src/types/cognitive.js';

function createRegistry() {
  const fs = createMemoryFs();
  const eventBus = createCapturingEventBus();
  const config = resolveConfig(undefined, fs);
  return new AgentRegistryImpl(config, eventBus);
}

function makeDummyAgent(name: string, localDir: string): AgentConfig {
  const dirs = {} as Record<CognitiveType, { local: string; global: string | undefined }>;
  for (const ct of ['skill', 'agent', 'prompt', 'rule'] as CognitiveType[]) {
    dirs[ct] = { local: localDir, global: undefined };
  }
  return {
    name: agentName(name),
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    dirs,
    detectInstalled: async () => false,
    showInUniversalList: localDir === '.agents',
  };
}

describe('AgentRegistryImpl', () => {
  it('getAll() returns non-empty map', () => {
    const registry = createRegistry();
    const all = registry.getAll();
    expect(all.size).toBeGreaterThan(0);
  });

  it('get() returns valid config for known agent', () => {
    const registry = createRegistry();
    const config = registry.get('claude-code');
    expect(config).toBeDefined();
    expect(config!.displayName).toBeTruthy();
  });

  it('get() returns undefined for unknown agent', () => {
    const registry = createRegistry();
    const config = registry.get('nonexistent-agent' as any);
    expect(config).toBeUndefined();
  });

  it('getUniversalAgents() returns agents with .agents localRoot', () => {
    const registry = createRegistry();
    const universals = registry.getUniversalAgents();
    expect(universals.length).toBeGreaterThan(0);
    for (const agentType of universals) {
      expect(registry.isUniversal(agentType)).toBe(true);
    }
  });

  it('getNonUniversalAgents() returns agents like cursor', () => {
    const registry = createRegistry();
    const nonUniversals = registry.getNonUniversalAgents();
    expect(nonUniversals.length).toBeGreaterThan(0);
    expect(nonUniversals).toContain('cursor');
  });

  it('isUniversal() returns true for universal agents and false for non-universal', () => {
    const registry = createRegistry();
    // Codex uses .agents as localRoot, so it is universal
    expect(registry.isUniversal('codex')).toBe(true);
    // Cursor uses .cursor as localRoot, so it is not universal
    expect(registry.isUniversal('cursor')).toBe(false);
  });

  it('register() adds a new agent', () => {
    const registry = createRegistry();
    const custom = makeDummyAgent('my-custom-agent', '.my-custom');
    registry.register(custom);
    const config = registry.get('my-custom-agent' as any);
    expect(config).toBeDefined();
    expect(config!.displayName).toBe('My-custom-agent');
  });
});
