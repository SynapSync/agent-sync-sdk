import type { ProviderRegistry } from '../types/source.js';
import type { SDKConfig } from '../types/config.js';
import { MintlifyProvider } from './mintlify.js';
import { HuggingFaceProvider } from './huggingface.js';
import { DirectURLProvider } from './direct.js';

export function registerDefaultProviders(
  registry: ProviderRegistry,
  config: SDKConfig,
): void {
  // Custom providers first (user-specified take priority)
  for (const custom of config.providers.custom) {
    registry.register(custom);
  }

  // Built-in providers in priority order
  registry.register(new MintlifyProvider());
  registry.register(new HuggingFaceProvider());
  registry.register(new DirectURLProvider());
}
