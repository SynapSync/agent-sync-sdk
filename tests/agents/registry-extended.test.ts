import { describe, it, expect } from 'vitest';
import { AgentRegistryImpl } from '../../src/agents/registry.js';
import { EventBusImpl } from '../../src/events/index.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { resolveConfig } from '../../src/config/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import type { AgentConfig } from '../../src/types/agent.js';
import { agentName } from '../../src/types/brands.js';

function createRegistry(fs = createMemoryFs()) {
  const eventBus = createCapturingEventBus();
  const config = resolveConfig(undefined, fs);
  return { registry: new AgentRegistryImpl(config, eventBus), config, eventBus };
}

describe('AgentRegistryImpl (extended)', () => {
  describe('getUniversalAgents', () => {
    it('returns agents with .agents localRoot (like codex)', () => {
      const { registry } = createRegistry();
      const universals = registry.getUniversalAgents();
      expect(universals.length).toBeGreaterThan(0);
      expect(universals).toContain('codex');
      // All universal agents should report isUniversal=true
      for (const agent of universals) {
        expect(registry.isUniversal(agent)).toBe(true);
      }
    });
  });

  describe('getNonUniversalAgents', () => {
    it('returns agents without .agents localRoot (like cursor, windsurf)', () => {
      const { registry } = createRegistry();
      const nonUniversals = registry.getNonUniversalAgents();
      expect(nonUniversals.length).toBeGreaterThan(0);
      expect(nonUniversals).toContain('cursor');
      expect(nonUniversals).toContain('windsurf');
      for (const agent of nonUniversals) {
        expect(registry.isUniversal(agent)).toBe(false);
      }
    });
  });

  describe('isUniversal', () => {
    it('returns true for codex (uses .agents localRoot)', () => {
      const { registry } = createRegistry();
      expect(registry.isUniversal('codex')).toBe(true);
    });

    it('returns false for cursor (uses .cursor localRoot)', () => {
      const { registry } = createRegistry();
      expect(registry.isUniversal('cursor')).toBe(false);
    });
  });

  describe('getDir', () => {
    it('returns local dir for skill', () => {
      const { registry } = createRegistry();
      const dir = registry.getDir('cursor', 'skill', 'local');
      expect(dir).toBeDefined();
      expect(dir!).toContain('.cursor/skills');
    });

    it('returns local dir for prompt', () => {
      const { registry } = createRegistry();
      const dir = registry.getDir('cursor', 'prompt', 'local');
      expect(dir).toBeDefined();
      expect(dir!).toContain('.cursor/prompts');
    });

    it('returns local dir for rule', () => {
      const { registry } = createRegistry();
      const dir = registry.getDir('cursor', 'rule', 'local');
      expect(dir).toBeDefined();
      expect(dir!).toContain('.cursor/rules');
    });

    it('returns local dir for agent', () => {
      const { registry } = createRegistry();
      const dir = registry.getDir('cursor', 'agent', 'local');
      expect(dir).toBeDefined();
      expect(dir!).toContain('.cursor/agents');
    });

    it('returns undefined for non-existent agent', () => {
      const { registry } = createRegistry();
      const dir = registry.getDir('nonexistent-agent' as any, 'skill', 'local');
      expect(dir).toBeUndefined();
    });
  });

  describe('register', () => {
    it('adds a new custom agent', () => {
      const { registry } = createRegistry();
      const customAgent: AgentConfig = {
        name: agentName('custom-agent'),
        displayName: 'Custom Agent',
        dirs: {
          skill: { local: '/project/.custom/skills', global: undefined },
          agent: { local: '/project/.custom/agents', global: undefined },
          prompt: { local: '/project/.custom/prompts', global: undefined },
          rule: { local: '/project/.custom/rules', global: undefined },
        },
        detectInstalled: async () => false,
        showInUniversalList: false,
      };

      registry.register(customAgent);
      const retrieved = registry.get('custom-agent' as any);
      expect(retrieved).toBeDefined();
      expect(retrieved!.displayName).toBe('Custom Agent');
    });

    it('throws on duplicate name', () => {
      const { registry } = createRegistry();
      const customAgent: AgentConfig = {
        name: agentName('custom-dup'),
        displayName: 'Custom Dup',
        dirs: {
          skill: { local: '/project/.custom/skills', global: undefined },
          agent: { local: '/project/.custom/agents', global: undefined },
          prompt: { local: '/project/.custom/prompts', global: undefined },
          rule: { local: '/project/.custom/rules', global: undefined },
        },
        detectInstalled: async () => false,
        showInUniversalList: false,
      };

      registry.register(customAgent);
      expect(() => registry.register(customAgent)).toThrow('already registered');
    });
  });

  describe('detectInstalled', () => {
    it('returns results and emits events', async () => {
      // Seed the memory fs with a .cursor directory to simulate detection
      const fs = createMemoryFs({
        [`${process.cwd()}/.cursor/skills/placeholder`]: '',
      });
      // Also create the .cursor directory itself
      await fs.mkdir(`${process.cwd()}/.cursor`, { recursive: true });

      const eventBus = createCapturingEventBus();
      const config = resolveConfig(undefined, fs);
      const registry = new AgentRegistryImpl(config, eventBus);

      const results = await registry.detectInstalled();

      // Should return results for all registered agents
      expect(results.length).toBeGreaterThan(0);

      // Each result has the expected shape
      for (const r of results) {
        expect(r).toHaveProperty('agent');
        expect(r).toHaveProperty('displayName');
        expect(typeof r.installed).toBe('boolean');
        expect(typeof r.isUniversal).toBe('boolean');
      }

      // Events should have been emitted
      const startEvents = eventBus.events.filter((e) => e.event === 'agent:detect:start');
      expect(startEvents).toHaveLength(1);

      const completeEvents = eventBus.events.filter((e) => e.event === 'agent:detect:complete');
      expect(completeEvents).toHaveLength(1);

      // cursor should be detected as installed (we seeded .cursor dir)
      const cursorResult = results.find((r) => r.agent === 'cursor');
      expect(cursorResult).toBeDefined();
      expect(cursorResult!.installed).toBe(true);

      // Found events should be emitted for detected agents
      const foundEvents = eventBus.events.filter((e) => e.event === 'agent:detect:found');
      expect(foundEvents.length).toBeGreaterThan(0);
    });
  });
});
