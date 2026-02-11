import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import { sourceIdentifier } from '../types/brands.js';
import { ProviderNotImplementedError } from '../errors/provider.js';

export class HuggingFaceProvider implements HostProvider {
  readonly id = 'huggingface';
  readonly displayName = 'Hugging Face';

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      if (url.hostname === 'huggingface.co') {
        return { matches: true, sourceIdentifier: sourceIdentifier(url.pathname.slice(1)) };
      }
    } catch {
      // Not a URL
    }
    return { matches: false };
  }

  async fetchCognitive(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive | null> {
    throw new ProviderNotImplementedError(this.id);
  }

  async fetchAll(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    throw new ProviderNotImplementedError(this.id);
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    try {
      const url = new URL(source);
      return url.pathname.slice(1);
    } catch {
      return source;
    }
  }
}
