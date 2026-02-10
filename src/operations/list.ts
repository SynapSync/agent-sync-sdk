import type { CognitError } from '../errors/base.js';
import type {
  ListOptions,
  ListResult,
  ListedCognitive,
} from '../types/operations.js';
import type { Result } from '../types/result.js';
import type { OperationContext } from './context.js';
import { ok, err } from '../types/result.js';
import { OperationError } from '../errors/operation.js';

export class ListOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(
    options?: Partial<ListOptions>,
  ): Promise<Result<ListResult, CognitError>> {
    const start = Date.now();
    this.ctx.eventBus.emit('operation:start', { operation: 'list', options });

    try {
      const result = await this.run(options);
      this.ctx.eventBus.emit('operation:complete', {
        operation: 'list',
        result,
        durationMs: Date.now() - start,
      });
      return ok(result);
    } catch (error) {
      const opError =
        error instanceof OperationError
          ? error
          : new OperationError(
              error instanceof Error ? error.message : String(error),
              ...(error instanceof Error ? [{ cause: error }] : []),
            );
      this.ctx.eventBus.emit('operation:error', {
        operation: 'list',
        error: opError,
      });
      return err(opError);
    }
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
