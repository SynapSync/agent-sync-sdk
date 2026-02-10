import { describe, it, expect } from 'vitest';
import { createAgentSyncSDK } from '../../src/sdk.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { isOk } from '../../src/types/result.js';

describe('Integration: multi-agent install', () => {
  function createTestSDK(fsSeed?: Record<string, string>) {
    const fs = createMemoryFs(fsSeed);
    const sdk = createAgentSyncSDK({
      cwd: '/project',
      homeDir: '/home/user',
      fs,
      telemetry: { enabled: false },
    });
    return { sdk, fs };
  }

  it('installs cognitive for multiple agents simultaneously', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/multi-skill/SKILL.md': [
        '---',
        'name: Multi Skill',
        'description: A skill installed for multiple agents',
        'category: general',
        '---',
        '# Multi Skill',
        'This is installed to multiple agents.',
      ].join('\n'),
    });

    const result = await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code', 'cursor', 'windsurf'] as const,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.installed.length).toBe(1);

      const installed = result.value.installed[0]!;
      expect(installed.name).toBe('Multi Skill');

      // Should have entries for each agent
      expect(installed.agents.length).toBe(3);

      const agentNames = installed.agents.map((a) => a.agent).sort();
      expect(agentNames).toEqual(['claude-code', 'cursor', 'windsurf']);
    }
  });

  it('creates canonical directory shared by all agents', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/shared-skill/SKILL.md': [
        '---',
        'name: Shared Skill',
        'description: Shared across agents',
        '---',
        '# Shared Skill',
        'Content.',
      ].join('\n'),
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code', 'cursor'] as const,
    });

    // Canonical path should exist
    const canonicalExists = await fs.exists(
      '/project/.agents/cognit/skills/general/shared-skill',
    );
    expect(canonicalExists).toBe(true);
  });

  it('creates agent-specific directories for non-universal agents', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/agent-dirs-skill/SKILL.md': [
        '---',
        'name: Agent Dirs Skill',
        'description: Tests agent-specific directories',
        '---',
        '# Agent Dirs Skill',
        'Content.',
      ].join('\n'),
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code'] as const,
    });

    // claude-code is non-universal (localRoot: '.claude'), so it should have
    // its own skill directory: /project/.claude/skills/agent-dirs-skill/
    const claudeSkillExists = await fs.exists(
      '/project/.claude/skills/agent-dirs-skill',
    );
    expect(claudeSkillExists).toBe(true);
  });

  it('tracks install events for each agent', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/tracked-skill/SKILL.md': [
        '---',
        'name: Tracked Skill',
        'description: Tracks install events',
        '---',
        '# Tracked Skill',
        'Content.',
      ].join('\n'),
    });

    const installEvents: Array<{ cognitive: string; agent: string }> = [];

    sdk.on('install:start', (payload) => {
      installEvents.push({
        cognitive: payload.cognitive,
        agent: payload.agent,
      });
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code', 'cursor'] as const,
    });

    // install:start is emitted from both AddOperation and InstallerImpl,
    // so we get 2 events per agent (4 total for 2 agents).
    expect(installEvents.length).toBe(4);
    const agents = [...new Set(installEvents.map((e) => e.agent))].sort();
    expect(agents).toEqual(['claude-code', 'cursor']);

    // All events should reference the same cognitive
    for (const event of installEvents) {
      expect(event.cognitive).toBe('Tracked Skill');
    }
  });

  it('installs multiple cognitives for multiple agents', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/skill-one/SKILL.md': [
        '---',
        'name: Skill One',
        'description: First skill',
        '---',
        '# Skill One',
        'Content one.',
      ].join('\n'),
      '/source/skills/skill-two/SKILL.md': [
        '---',
        'name: Skill Two',
        'description: Second skill',
        '---',
        '# Skill Two',
        'Content two.',
      ].join('\n'),
    });

    const result = await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code', 'cursor'] as const,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.installed.length).toBe(2);

      for (const installed of result.value.installed) {
        expect(installed.agents.length).toBe(2);
      }
    }
  });

  it('lock file contains all installed cognitives after multi-agent install', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/lock-test/SKILL.md': [
        '---',
        'name: Lock Test Skill',
        'description: Lock file test',
        '---',
        '# Lock Test Skill',
        'Content.',
      ].join('\n'),
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code', 'cursor'] as const,
    });

    const lockContent = await fs.readFile(
      '/project/.agents/cognit/.cognit-lock.json',
      'utf-8',
    );
    const lock = JSON.parse(lockContent) as {
      cognitives: Record<string, { cognitiveType: string }>;
    };

    expect(lock.cognitives['Lock Test Skill']).toBeDefined();
    expect(lock.cognitives['Lock Test Skill']!.cognitiveType).toBe('skill');
  });
});
