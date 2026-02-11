import matter from 'gray-matter';
import type { HostProvider, ProviderMatch, ProviderFetchOptions, GitClient } from '../types/source.js';
import type { RemoteCognitive, CognitiveType } from '../types/cognitive.js';
import type { EventBus } from '../types/events.js';
import { sourceIdentifier, safeName } from '../types/brands.js';
import { ProviderFetchError, NoCognitivesFoundError } from '../errors/provider.js';
import { isCognitiveType } from '../types/cognitive.js';

interface DiscoveryLike {
  discover(basePath: string, options?: { subpath?: string }): Promise<ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly path: string;
    readonly type: string;
    readonly rawContent: string;
    readonly metadata: Readonly<Record<string, unknown>>;
  }>>;
}

const GITHUB_URL_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)/;
const SHORTHAND_RE = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/;
const BLOB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;

export class GitHubProvider implements HostProvider {
  readonly id = 'github';
  readonly displayName = 'GitHub';

  constructor(
    private readonly gitClient: GitClient,
    private readonly discovery: DiscoveryLike,
    private readonly eventBus: EventBus,
    private readonly fetchTimeoutMs: number = 15_000,
  ) {}

  match(source: string): ProviderMatch {
    const ghMatch = source.match(GITHUB_URL_RE);
    if (ghMatch) {
      return { matches: true, sourceIdentifier: sourceIdentifier(`${ghMatch[1]}/${ghMatch[2]!.replace(/\.git$/, '')}`) };
    }
    if (!source.startsWith('.') && !source.includes('://')) {
      const shortMatch = source.match(SHORTHAND_RE);
      if (shortMatch) {
        return { matches: true, sourceIdentifier: sourceIdentifier(`${shortMatch[1]}/${shortMatch[2]}`) };
      }
    }
    return { matches: false };
  }

  async fetchCognitive(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive | null> {
    const blobMatch = source.match(BLOB_RE);
    if (!blobMatch) return null;

    const rawUrl = this.toRawUrl(source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: rawUrl });

    try {
      const signal = options?.signal ?? AbortSignal.timeout(this.fetchTimeoutMs);
      const response = await fetch(rawUrl, {
        signal,
        headers: { 'User-Agent': 'agent-sync-sdk' },
      });
      if (!response.ok) {
        this.eventBus.emit('provider:fetch:error', { providerId: this.id, url: rawUrl, error: `HTTP ${response.status}` });
        return null;
      }

      const content = await response.text();
      const parsed = matter(content);
      const data = parsed.data as Record<string, unknown>;
      const name = (typeof data['name'] === 'string' ? data['name'] : null) ?? blobMatch[4]!.split('/').pop()?.replace(/\.md$/i, '') ?? 'unknown';
      const ownerRepo = `${blobMatch[1]}/${blobMatch[2]}`;

      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: rawUrl, found: true });

      return {
        name,
        description: (typeof data['description'] === 'string' ? data['description'] : '') ?? '',
        content,
        installName: safeName(name.toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: source,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(ownerRepo),
        type: isCognitiveType(data['type']) ? data['type'] : 'skill',
        metadata: Object.freeze({ ...data }),
      };
    } catch (cause) {
      this.eventBus.emit('provider:fetch:error', { providerId: this.id, url: rawUrl, error: (cause as Error).message });
      throw new ProviderFetchError(rawUrl, this.id, undefined, { cause: cause as Error });
    }
  }

  async fetchAll(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    const cloneUrl = this.resolveCloneUrl(source);
    const tempDir = await this.gitClient.clone(cloneUrl, {
      ...(options?.ref != null && { ref: options.ref }),
    });

    try {
      const discoverOpts = options?.subpath != null ? { subpath: options.subpath } : undefined;
      const cognitives = await this.discovery.discover(tempDir, discoverOpts);

      if (cognitives.length === 0) {
        throw new NoCognitivesFoundError(source, this.id);
      }

      const ownerRepo = this.getSourceIdentifier(source);

      return cognitives.map((cog) => ({
        name: String(cog.name),
        description: cog.description,
        content: cog.rawContent,
        installName: safeName(String(cog.name).toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: source,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(ownerRepo),
        type: cog.type as CognitiveType,
        metadata: Object.freeze({ ...cog.metadata }),
      }));
    } finally {
      await this.gitClient.cleanup(tempDir);
    }
  }

  toRawUrl(url: string): string {
    const blobMatch = url.match(BLOB_RE);
    if (blobMatch) {
      return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}/${blobMatch[4]}`;
    }
    return url;
  }

  getSourceIdentifier(source: string): string {
    const ghMatch = source.match(GITHUB_URL_RE);
    if (ghMatch) return `${ghMatch[1]}/${ghMatch[2]!.replace(/\.git$/, '')}`;
    const shortMatch = source.match(SHORTHAND_RE);
    if (shortMatch) return `${shortMatch[1]}/${shortMatch[2]}`;
    return source;
  }

  private resolveCloneUrl(source: string): string {
    if (source.startsWith('https://github.com/')) {
      const match = source.match(GITHUB_URL_RE);
      if (match) return `https://github.com/${match[1]}/${match[2]!.replace(/\.git$/, '')}.git`;
    }
    const shortMatch = source.match(SHORTHAND_RE);
    if (shortMatch) return `https://github.com/${shortMatch[1]}/${shortMatch[2]}.git`;
    return source;
  }
}
