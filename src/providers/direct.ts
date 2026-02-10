import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import { sourceIdentifier } from '../types/brands.js';

const COGNITIVE_FILE_PATTERN = /\/(SKILL|AGENT|PROMPT|RULE)\.md$/i;
const GIT_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);

export class DirectURLProvider implements HostProvider {
  readonly id = 'direct-url';
  readonly displayName = 'Direct URL';

  match(source: string): ProviderMatch {
    if (!source.startsWith('http://') && !source.startsWith('https://')) {
      return { matches: false };
    }
    if (!COGNITIVE_FILE_PATTERN.test(source)) {
      return { matches: false };
    }
    try {
      const url = new URL(source);
      if (GIT_HOSTS.has(url.hostname) && !source.includes('/raw/')) {
        return { matches: false };
      }
      return { matches: true, sourceIdentifier: sourceIdentifier(source) };
    } catch {
      return { matches: false };
    }
  }

  async fetchCognitive(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive | null> {
    return null; // Stub
  }

  async fetchAll(_source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    return []; // Stub
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    return source;
  }
}
