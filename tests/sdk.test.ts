import { describe, it, expect } from 'vitest';
import { createAgentSyncSDK } from '../src/sdk.js';
import { createMemoryFs } from '../src/fs/memory.js';
import { isOk } from '../src/types/result.js';

describe('createAgentSyncSDK', () => {
  it('creates a fully wired SDK instance', () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({
      cwd: '/project',
      homeDir: '/home/user',
      fs,
    });

    expect(sdk.config.cwd).toBe('/project');
    expect(sdk.events).toBeDefined();
    expect(sdk.agents).toBeDefined();
    expect(sdk.providers).toBeDefined();
    // Should have 39+ agents loaded from generated configs
    expect(sdk.agents.getAll().size).toBeGreaterThan(35);
  });

  it('exposes event subscription via on()', () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const events: string[] = [];
    const unsub = sdk.on('operation:start', () => {
      events.push('start');
    });
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('exposes event subscription via once()', () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const unsub = sdk.once('operation:start', () => {});
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('sdk.list() returns empty when no cognitives installed', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const result = await sdk.list();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.count).toBe(0);
      expect(result.value.cognitives).toEqual([]);
    }
  });

  it('sdk.check() succeeds with no entries', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const result = await sdk.check();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
    }
  });

  it('sdk.init() creates a new cognitive scaffold', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const result = await sdk.init('my-skill', 'skill', { description: 'My test skill' });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.path).toContain('my-skill');
      expect(result.value.cognitiveType).toBe('skill');
    }
  });

  it('sdk.dispose() completes without error', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });
    await expect(sdk.dispose()).resolves.toBeUndefined();
  });

  it('sdk.dispose() clears event handlers', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    let called = false;
    sdk.on('operation:start', () => {
      called = true;
    });

    await sdk.dispose();

    // Emit after dispose — handler should NOT fire
    sdk.events.emit('operation:start', { operation: 'test', options: {} });
    expect(called).toBe(false);
  });

  it('sdk.dispose() is idempotent', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    await sdk.dispose();
    await expect(sdk.dispose()).resolves.toBeUndefined();
  });

  it('registers providers in correct priority order', () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', homeDir: '/home/user', fs });

    const providers = sdk.providers.getAll();
    expect(providers.length).toBeGreaterThanOrEqual(5);
    // GitHub should be first (highest priority)
    const ids = providers.map((p) => p.id);
    expect(ids[0]).toBe('github');
    expect(ids[1]).toBe('local');
  });
});
