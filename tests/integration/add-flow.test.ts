import { describe, it, expect } from 'vitest';
import { createAgentSyncSDK } from '../../src/sdk.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { isOk, isErr } from '../../src/types/result.js';
import type { SDKEventMap } from '../../src/types/events.js';

describe('Integration: add flow', () => {
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

  it('discovers and lists available cognitives from local source (not confirmed)', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/react-19/SKILL.md': [
        '---',
        'name: React 19',
        'description: React 19 patterns and best practices',
        'category: frontend',
        'tags: [react, typescript]',
        '---',
        '# React 19',
        'Content about React 19.',
      ].join('\n'),
    });

    const result = await sdk.add('/source');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      // When not confirmed, add returns available list but does not install
      expect(result.value.available).toBeDefined();
      expect(result.value.available!.length).toBeGreaterThanOrEqual(1);
      expect(result.value.installed.length).toBe(0);

      const found = result.value.available!.find(
        (c) => c.name === 'React 19',
      );
      expect(found).toBeDefined();
      expect(found!.cognitiveType).toBe('skill');
    }
  });

  it('installs cognitive with confirmed: true and agents specified', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/react-19/SKILL.md': [
        '---',
        'name: React 19',
        'description: React 19 patterns and best practices',
        'category: frontend',
        'tags: [react, typescript]',
        '---',
        '# React 19',
        'Content about React 19.',
      ].join('\n'),
    });

    const result = await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code'] as const,
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.installed.length).toBe(1);
      expect(result.value.installed[0]!.name).toBe('React 19');
      expect(result.value.installed[0]!.cognitiveType).toBe('skill');

      // Verify agent install info
      const agentInfo = result.value.installed[0]!.agents;
      expect(agentInfo.length).toBe(1);
      expect(agentInfo[0]!.agent).toBe('claude-code');
    }
  });

  it('creates canonical directory after confirmed install', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/react-19/SKILL.md': [
        '---',
        'name: React 19',
        'description: React 19 patterns',
        'category: frontend',
        '---',
        '# React 19',
        'Content.',
      ].join('\n'),
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code'] as const,
    });

    // Canonical path: /project/.agents/cognit/skills/general/react-19/
    const canonicalExists = await fs.exists(
      '/project/.agents/cognit/skills/general/react-19',
    );
    expect(canonicalExists).toBe(true);
  });

  it('writes lock entry after confirmed install', async () => {
    const { sdk, fs } = createTestSDK({
      '/source/skills/react-19/SKILL.md': [
        '---',
        'name: React 19',
        'description: React 19 patterns',
        'category: frontend',
        '---',
        '# React 19',
        'Content.',
      ].join('\n'),
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code'] as const,
    });

    // Lock file should exist at /project/.agents/cognit/.cognit-lock.json
    const lockExists = await fs.exists(
      '/project/.agents/cognit/.cognit-lock.json',
    );
    expect(lockExists).toBe(true);

    // Read and parse lock to verify entry
    const lockContent = await fs.readFile(
      '/project/.agents/cognit/.cognit-lock.json',
      'utf-8',
    );
    const lock = JSON.parse(lockContent) as {
      cognitives: Record<string, { cognitiveType: string; contentHash: string }>;
    };

    expect(lock.cognitives['React 19']).toBeDefined();
    expect(lock.cognitives['React 19']!.cognitiveType).toBe('skill');
    expect(lock.cognitives['React 19']!.contentHash).toBeTruthy();
  });

  it('tracks operation:start and operation:complete events', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/react-19/SKILL.md': [
        '---',
        'name: React 19',
        'description: React 19 patterns',
        '---',
        '# React 19',
        'Content.',
      ].join('\n'),
    });

    const events: Array<{ event: string; payload: unknown }> = [];

    sdk.on('operation:start', (payload) => {
      events.push({ event: 'operation:start', payload });
    });
    sdk.on('operation:complete', (payload) => {
      events.push({ event: 'operation:complete', payload });
    });

    await sdk.add('/source', {
      confirmed: true,
      agents: ['claude-code'] as const,
    });

    const startEvents = events.filter((e) => e.event === 'operation:start');
    const completeEvents = events.filter(
      (e) => e.event === 'operation:complete',
    );

    expect(startEvents.length).toBeGreaterThanOrEqual(1);
    expect(completeEvents.length).toBeGreaterThanOrEqual(1);

    // Verify the start event contains operation name
    const startPayload = startEvents[0]!.payload as { operation: string };
    expect(startPayload.operation).toBe('add');

    // Verify the complete event contains duration
    const completePayload = completeEvents[0]!.payload as {
      operation: string;
      durationMs: number;
    };
    expect(completePayload.operation).toBe('add');
    expect(typeof completePayload.durationMs).toBe('number');
  });

  it('handles empty source directory gracefully', async () => {
    const { sdk } = createTestSDK({
      '/empty-source/.gitkeep': '',
    });

    const result = await sdk.add('/empty-source');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(false);
      expect(result.value.installed.length).toBe(0);
      expect(result.value.message).toContain('No cognitives found');
    }
  });

  it('discovers multiple cognitives from a single source', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/skill-a/SKILL.md': [
        '---',
        'name: Skill A',
        'description: First skill',
        '---',
        '# Skill A',
        'Content A.',
      ].join('\n'),
      '/source/skills/skill-b/SKILL.md': [
        '---',
        'name: Skill B',
        'description: Second skill',
        '---',
        '# Skill B',
        'Content B.',
      ].join('\n'),
    });

    const result = await sdk.add('/source');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBeDefined();
      expect(result.value.available!.length).toBe(2);
      const names = result.value.available!.map((c) => c.name).sort();
      expect(names).toEqual(['Skill A', 'Skill B']);
    }
  });

  it('returns available list when confirmed but no agents specified', async () => {
    const { sdk } = createTestSDK({
      '/source/skills/my-skill/SKILL.md': [
        '---',
        'name: My Skill',
        'description: A test skill',
        '---',
        '# My Skill',
        'Content.',
      ].join('\n'),
    });

    // confirmed=true but no agents -- should still return available list
    const result = await sdk.add('/source', { confirmed: true });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.available).toBeDefined();
      expect(result.value.available!.length).toBe(1);
      expect(result.value.installed.length).toBe(0);
    }
  });
});
