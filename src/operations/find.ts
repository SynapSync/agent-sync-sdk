import type { CognitError } from '../errors/base.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import type { ProviderFetchOptions, SourceDescriptor } from '../types/source.js';
import type {
  FindOptions,
  FindResult,
  DiscoveredCognitive,
} from '../types/operations.js';
import type { Result } from '../types/result.js';
import { BaseOperation } from './base.js';

export class FindOperation extends BaseOperation {
  async execute(
    source: string,
    options?: Partial<FindOptions>,
  ): Promise<Result<FindResult, CognitError>> {
    return this.executeWithLifecycle('find', options, () => this.run(source, options));
  }

  private async run(
    source: string,
    options?: Partial<FindOptions>,
  ): Promise<FindResult> {
    // 1. Parse source and find provider
    const parsed = this.ctx.sourceParser.parse(source);
    const remoteCognitives = await this.fetchRemote(source, parsed, options);

    // 2. Get installed entries for cross-reference
    const allEntries = await this.ctx.lockManager.getAllEntries();
    const installedNames = new Set(Object.keys(allEntries));

    // 3. Build results with installed flag
    let results: DiscoveredCognitive[] = remoteCognitives.map((c) => ({
      name: c.installName as string,
      description: c.description,
      cognitiveType: c.type,
      installed: installedNames.has(c.installName as string),
    }));

    // 4. Apply cognitiveType filter
    if (options?.cognitiveType != null) {
      const typeFilter = options.cognitiveType;
      results = results.filter((r) => r.cognitiveType === typeFilter);
    }

    const total = results.length;

    // 5. Apply limit
    if (options?.limit != null && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    const message =
      total > 0
        ? `Found ${total} cognitive(s) at ${source}.`
        : `No cognitives found at ${source}.`;

    return {
      success: total > 0,
      results,
      total,
      source,
      message,
    };
  }

  private async fetchRemote(
    source: string,
    parsed: SourceDescriptor,
    options?: Partial<FindOptions>,
  ): Promise<RemoteCognitive[]> {
    let provider = this.ctx.providerRegistry.findProvider(parsed.url);
    if (!provider) {
      provider = this.ctx.providerRegistry.findProvider(source);
    }

    if (!provider) {
      return [];
    }

    const fetchOptions: ProviderFetchOptions = {
      ...(options?.cognitiveType != null && {
        cognitiveType: options.cognitiveType,
      }),
      ...(parsed.subpath != null && { subpath: parsed.subpath }),
      ...(parsed.ref != null && { ref: parsed.ref }),
      ...(parsed.nameFilter != null && { nameFilter: parsed.nameFilter }),
    };

    return provider.fetchAll(source, fetchOptions);
  }
}
