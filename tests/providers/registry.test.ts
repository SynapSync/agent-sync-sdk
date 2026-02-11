import { describe, it, expect } from 'vitest';
import { createCapturingEventBus } from '../../src/events/index.js';
import { ProviderRegistryImpl } from '../../src/providers/registry.js';
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../../src/types/source.js';
import type { RemoteCognitive } from '../../src/types/cognitive.js';

function createMockProvider(id: string, matchFn: (s: string) => boolean): HostProvider {
  return {
    id,
    displayName: id,
    match: (source: string): ProviderMatch => ({ matches: matchFn(source) }),
    fetchCognitive: async (
      _s: string,
      _o?: ProviderFetchOptions,
    ): Promise<RemoteCognitive | null> => null,
    fetchAll: async (_s: string, _o?: ProviderFetchOptions): Promise<RemoteCognitive[]> => [],
    toRawUrl: (url: string) => url,
    getSourceIdentifier: (s: string) => s,
  };
}

describe('ProviderRegistryImpl', () => {
  it('registers a provider', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    const provider = createMockProvider('test', () => true);
    registry.register(provider);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]!.id).toBe('test');
  });

  it('rejects duplicate provider id', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    registry.register(createMockProvider('test', () => true));
    expect(() => registry.register(createMockProvider('test', () => true))).toThrow(
      'already registered',
    );
  });

  it('findProvider returns first matching provider', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    registry.register(createMockProvider('first', (s) => s.includes('github')));
    registry.register(createMockProvider('second', (s) => s.includes('github')));
    const found = registry.findProvider('https://github.com/owner/repo');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('first');
  });

  it('findProvider respects registration order', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    registry.register(createMockProvider('a', () => false));
    registry.register(createMockProvider('b', () => true));
    const found = registry.findProvider('anything');
    expect(found!.id).toBe('b');
  });

  it('findProvider returns null when no match', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    registry.register(createMockProvider('test', () => false));
    expect(registry.findProvider('anything')).toBeNull();
  });

  it('getAll returns all providers in order', () => {
    const eventBus = createCapturingEventBus();
    const registry = new ProviderRegistryImpl(eventBus);
    registry.register(createMockProvider('a', () => false));
    registry.register(createMockProvider('b', () => false));
    registry.register(createMockProvider('c', () => false));
    const all = registry.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
