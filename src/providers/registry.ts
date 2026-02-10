import type { HostProvider, ProviderRegistry } from '../types/source.js';
import type { EventBus } from '../types/events.js';

export class ProviderRegistryImpl implements ProviderRegistry {
  private readonly providers: HostProvider[] = [];

  constructor(private readonly eventBus: EventBus) {}

  register(provider: HostProvider): void {
    if (this.providers.some((p) => p.id === provider.id)) {
      throw new Error(`Provider with id "${provider.id}" already registered`);
    }
    this.providers.push(provider);
  }

  findProvider(source: string): HostProvider | null {
    for (const provider of this.providers) {
      const match = provider.match(source);
      if (match.matches) return provider;
    }
    return null;
  }

  getAll(): readonly HostProvider[] {
    return [...this.providers];
  }
}
