import { describe, it, expect } from 'vitest';
import { ProviderRegistryImpl } from '../../src/providers/registry.js';
import { EventBusImpl } from '../../src/events/index.js';
import { registerDefaultProviders } from '../../src/providers/register-defaults.js';
import { resolveConfig } from '../../src/config/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../../src/types/source.js';
import type { RemoteCognitive } from '../../src/types/cognitive.js';

function createMockCustomProvider(id: string): HostProvider {
  return {
    id,
    displayName: id,
    match: (_source: string): ProviderMatch => ({ matches: false }),
    fetchCognitive: async (
      _s: string,
      _o?: ProviderFetchOptions,
    ): Promise<RemoteCognitive | null> => null,
    fetchAll: async (_s: string, _o?: ProviderFetchOptions): Promise<RemoteCognitive[]> => [],
    toRawUrl: (url: string) => url,
    getSourceIdentifier: (s: string) => s,
  };
}

describe('registerDefaultProviders', () => {
  it('registers 3 default providers (mintlify, huggingface, direct-url)', () => {
    const eventBus = new EventBusImpl();
    const registry = new ProviderRegistryImpl(eventBus);
    const fs = createMemoryFs();
    const config = resolveConfig(undefined, fs);

    registerDefaultProviders(registry, config);

    const all = registry.getAll();
    expect(all).toHaveLength(3);
    const ids = all.map((p) => p.id);
    expect(ids).toContain('mintlify');
    expect(ids).toContain('huggingface');
    expect(ids).toContain('direct-url');
  });

  it('registers custom providers before defaults', () => {
    const eventBus = new EventBusImpl();
    const registry = new ProviderRegistryImpl(eventBus);
    const fs = createMemoryFs();
    const customProvider = createMockCustomProvider('my-custom');
    const config = resolveConfig({ providers: { custom: [customProvider] } }, fs);

    registerDefaultProviders(registry, config);

    const all = registry.getAll();
    expect(all).toHaveLength(4);
    // Custom provider is registered first
    expect(all[0]!.id).toBe('my-custom');
    // Then defaults follow
    expect(all[1]!.id).toBe('mintlify');
    expect(all[2]!.id).toBe('huggingface');
    expect(all[3]!.id).toBe('direct-url');
  });

  it('all providers are retrievable from registry', () => {
    const eventBus = new EventBusImpl();
    const registry = new ProviderRegistryImpl(eventBus);
    const fs = createMemoryFs();
    const config = resolveConfig(undefined, fs);

    registerDefaultProviders(registry, config);

    // Mintlify URL should be found
    const mintlifyProvider = registry.findProvider('https://mintlify.com/docs/test');
    expect(mintlifyProvider).not.toBeNull();
    expect(mintlifyProvider!.id).toBe('mintlify');

    // HuggingFace URL should be found
    const hfProvider = registry.findProvider('https://huggingface.co/owner/repo');
    expect(hfProvider).not.toBeNull();
    expect(hfProvider!.id).toBe('huggingface');

    // Direct URL should be found
    const directProvider = registry.findProvider('https://example.com/SKILL.md');
    expect(directProvider).not.toBeNull();
    expect(directProvider!.id).toBe('direct-url');
  });
});
