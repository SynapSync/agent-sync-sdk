import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import { sourceIdentifier } from '../types/brands.js';

export class MintlifyProvider implements HostProvider {
  readonly id = 'mintlify';
  readonly displayName = 'Mintlify';

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      if (url.hostname === 'mintlify.com' || url.hostname.endsWith('.mintlify.com')) {
        return { matches: true, sourceIdentifier: sourceIdentifier(url.hostname + url.pathname) };
      }
    } catch {
      // Not a URL
    }
    return { matches: false };
  }

  async fetchCognitive(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive | null> {
    return null; // Stub — full implementation in Sprint 7
  }

  async fetchAll(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    return []; // Stub
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    try {
      const url = new URL(source);
      return url.hostname + url.pathname;
    } catch {
      return source;
    }
  }
}
