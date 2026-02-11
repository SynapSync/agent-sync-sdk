import * as path from 'node:path';
import matter from 'gray-matter';
import type { HostProvider, ProviderMatch, ProviderFetchOptions } from '../types/source.js';
import type { RemoteCognitive, CognitiveType } from '../types/cognitive.js';
import type { FileSystemAdapter } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { DiscoveryService } from '../discovery/index.js';
import { sourceIdentifier, safeName } from '../types/brands.js';

export class LocalProvider implements HostProvider {
  readonly id = 'local';
  readonly displayName = 'Local';

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly discovery: DiscoveryService,
    private readonly eventBus: EventBus,
    private readonly cwd: string,
  ) {}

  match(source: string): ProviderMatch {
    if (
      source.startsWith('/') ||
      source.startsWith('./') ||
      source.startsWith('../') ||
      source === '.' ||
      source === '..' ||
      /^[A-Z]:[/\\]/i.test(source)
    ) {
      const resolved = path.resolve(this.cwd, source);
      return { matches: true, sourceIdentifier: sourceIdentifier(resolved) };
    }
    return { matches: false };
  }

  async fetchCognitive(source: string, _options?: ProviderFetchOptions): Promise<RemoteCognitive | null> {
    const resolved = path.resolve(this.cwd, source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: resolved });

    try {
      const content = await this.fs.readFile(resolved, 'utf-8');
      const parsed = matter(content);
      const data = parsed.data as Record<string, unknown>;
      const name = (typeof data['name'] === 'string' ? data['name'] : null) ?? path.basename(path.dirname(resolved));

      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: resolved, found: true });

      return {
        name,
        description: (typeof data['description'] === 'string' ? data['description'] : '') ?? '',
        content,
        installName: safeName(name.toLowerCase().replace(/\s+/g, '-')),
        sourceUrl: `file://${resolved}`,
        providerId: this.id,
        sourceIdentifier: sourceIdentifier(resolved),
        type: (data['type'] as CognitiveType) ?? 'skill',
        metadata: Object.freeze({ ...data }),
      };
    } catch {
      this.eventBus.emit('provider:fetch:complete', { providerId: this.id, url: resolved, found: false });
      return null;
    }
  }

  async fetchAll(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive[]> {
    const resolved = path.resolve(this.cwd, source);
    this.eventBus.emit('provider:fetch:start', { providerId: this.id, url: resolved });

    const discoverOpts = options?.subpath != null ? { subpath: options.subpath } : undefined;
    const cognitives = await this.discovery.discover(resolved, discoverOpts);

    this.eventBus.emit('provider:fetch:complete', {
      providerId: this.id,
      url: resolved,
      found: cognitives.length > 0,
    });

    return cognitives.map((cog) => ({
      name: String(cog.name),
      description: cog.description,
      content: cog.rawContent,
      installName: safeName(String(cog.name).toLowerCase().replace(/\s+/g, '-')),
      sourceUrl: `file://${cog.path}`,
      providerId: this.id,
      sourceIdentifier: sourceIdentifier(resolved),
      type: cog.type as CognitiveType,
      metadata: Object.freeze({ ...cog.metadata }),
    }));
  }

  toRawUrl(url: string): string {
    return url;
  }

  getSourceIdentifier(source: string): string {
    return path.resolve(this.cwd, source);
  }
}
