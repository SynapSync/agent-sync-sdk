import type { CognitError } from '../errors/base.js';
import type {
  ListOptions,
  ListResult,
  ListedCognitive,
} from '../types/operations.js';
import type { Result } from '../types/result.js';
import { BaseOperation } from './base.js';

export class ListOperation extends BaseOperation {
  async execute(
    options?: Partial<ListOptions>,
  ): Promise<Result<ListResult, CognitError>> {
    return this.executeWithLifecycle('list', options, () => this.run(options));
  }

  private async run(options?: Partial<ListOptions>): Promise<ListResult> {
    const allEntries = await this.ctx.lockManager.getAllEntries();
    const entries = Object.entries(allEntries);

    let filtered = entries;

    // Filter by cognitiveType
    if (options?.cognitiveType != null) {
      const typeFilter = options.cognitiveType;
      filtered = filtered.filter(([, entry]) => entry.cognitiveType === typeFilter);
    }

    // Build listed cognitives
    const cognitives: ListedCognitive[] = filtered
      .map(([name, entry]) => ({
        name,
        cognitiveType: entry.cognitiveType,
        source: entry.source as string,
        sourceUrl: entry.sourceUrl,
        installedAt: entry.installedAt,
        updatedAt: entry.updatedAt,
        contentHash: entry.contentHash,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const count = cognitives.length;
    const message =
      count > 0
        ? `Found ${count} installed cognitive(s).`
        : 'No cognitives installed.';

    return { success: true, cognitives, count, message };
  }
}
