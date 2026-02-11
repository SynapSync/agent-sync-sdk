import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive, CognitiveType } from '../types/cognitive.js';
import { sourceIdentifier, safeName } from '../types/brands.js';
import { isCognitiveType } from '../types/cognitive.js';
import { withRetry, isRetryableNetworkError } from '../utils/retry.js';

const KNOWN_GIT_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org', 'huggingface.co']);

interface WellKnownIndex {
  readonly cognitives: ReadonlyArray<{
    readonly name: string;
    readonly type: CognitiveType;
    readonly url: string;
    readonly description: string;
  }>;
}

export class WellKnownProvider implements HostProvider {
  readonly id = 'wellknown';
  readonly displayName = 'Well-Known Endpoint';

  constructor(private readonly fetchTimeoutMs: number = 15_000) {}

  match(source: string): ProviderMatch {
    try {
      const url = new URL(source);
      // Only match HTTPS URLs that are NOT known git hosts
      // And NOT direct .md file URLs (those are caught by DirectURLProvider)
      if (url.protocol !== 'https:') return { matches: false };
      if (KNOWN_GIT_HOSTS.has(url.hostname)) return { matches: false };
      if (url.pathname.endsWith('.md')) return { matches: false };
      return {
        matches: true,
        sourceIdentifier: sourceIdentifier(`wellknown/${url.hostname}`),
      };
    } catch {
      return { matches: false };
    }
  }

  async fetchCognitive(
    source: string,
    _options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive | null> {
    const all = await this.fetchAll(source);
    return all[0] ?? null;
  }

  async fetchAll(source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      return [];
    }

    // Try the standard well-known endpoint first
    const indexUrl = `${url.origin}/.well-known/cognitives/index.json`;
    let index = await this.fetchIndex(indexUrl);

    // Legacy fallback: /.well-known/skills/index.json
    if (index == null) {
      const legacyUrl = `${url.origin}/.well-known/skills/index.json`;
      index = await this.fetchIndex(legacyUrl);
    }

    if (index == null) return [];

    return this.parseIndex(index, url.origin);
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    try {
      return `wellknown/${new URL(source).hostname}`;
    } catch {
      return `wellknown/${source}`;
    }
  }

  private async fetchIndex(indexUrl: string): Promise<WellKnownIndex | null> {
    try {
      const response = await withRetry(
        () =>
          fetch(indexUrl, {
            signal: AbortSignal.timeout(this.fetchTimeoutMs),
            headers: { 'User-Agent': 'agent-sync-sdk' },
          }),
        { shouldRetry: (err) => isRetryableNetworkError(err) },
      );
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!this.isValidIndex(data)) return null;
      return data;
    } catch {
      return null;
    }
  }

  private isValidIndex(data: unknown): data is WellKnownIndex {
    if (typeof data !== 'object' || data == null) return false;
    const obj = data as Record<string, unknown>;
    return Array.isArray(obj['cognitives']);
  }

  private parseIndex(index: WellKnownIndex, origin: string): RemoteCognitive[] {
    const results: RemoteCognitive[] = [];

    for (const entry of index.cognitives) {
      // Validate required fields
      if (typeof entry !== 'object' || entry == null) continue;
      if (typeof entry.name !== 'string' || entry.name.length === 0) continue;
      if (typeof entry.url !== 'string' || entry.url.length === 0) continue;
      const description = typeof entry.description === 'string' ? entry.description : '';
      const type: CognitiveType = isCognitiveType(entry.type) ? entry.type : 'skill';

      const entryUrl = entry.url.startsWith('http')
        ? entry.url
        : `${origin}${entry.url.startsWith('/') ? '' : '/'}${entry.url}`;

      results.push({
        name: entry.name,
        description,
        content: '', // Content would be fetched separately
        installName: safeName(entry.name.toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: entryUrl,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(`wellknown/${new URL(origin).hostname}`),
        type,
        metadata: Object.freeze({}),
      });
    }

    return results;
  }
}
