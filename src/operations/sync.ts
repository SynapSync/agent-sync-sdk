import { join } from 'node:path';
import type { CognitError } from '../errors/base.js';
import type { Result } from '../types/result.js';
import type {
  SyncOptions,
  SyncResult,
  SyncIssue,
} from '../types/operations.js';
import type { OperationContext } from './context.js';
import { ok, err } from '../types/result.js';
import { OperationError } from '../errors/operation.js';
import { COGNITIVE_SUBDIRS } from '../types/cognitive.js';
import { sanitizeName } from '../installer/security.js';
import { verifyContentHash } from '../lock/integrity.js';

export class SyncOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(
    options?: Partial<SyncOptions>,
  ): Promise<Result<SyncResult, CognitError>> {
    const startTime = Date.now();
    const opName = 'sync';

    this.ctx.eventBus.emit('operation:start', {
      operation: opName,
      options: options as unknown,
    });

    try {
      const allEntries = await this.ctx.lockManager.getAllEntries();
      const issues: SyncIssue[] = [];

      for (const name of Object.keys(allEntries)) {
        const entry = allEntries[name];
        if (entry == null) continue;

        const subdir = COGNITIVE_SUBDIRS[entry.cognitiveType];
        const safeName = sanitizeName(name);
        const category = entry.category ?? 'general';
        const canonicalPath = join(
          this.ctx.config.cwd,
          '.agents',
          'cognit',
          subdir,
          category,
          safeName,
        );

        const exists = await this.ctx.config.fs.exists(canonicalPath);
        if (!exists) {
          const shouldFix =
            options?.dryRun !== true && options?.confirmed === true;

          issues.push({
            name,
            type: 'missing_files',
            description: `Canonical path does not exist: ${canonicalPath}`,
            fixed: shouldFix,
          });

          continue;
        }

        const hashValid = await verifyContentHash(
          canonicalPath,
          entry.contentHash,
          this.ctx.config.fs,
        );

        if (!hashValid) {
          const shouldFix =
            options?.dryRun !== true && options?.confirmed === true;

          issues.push({
            name,
            type: 'lock_mismatch',
            description: `Content hash mismatch for "${name}" at ${canonicalPath}`,
            fixed: shouldFix,
          });
        }
      }

      const fixedCount = issues.filter((i) => i.fixed).length;
      const remainingCount = issues.length - fixedCount;

      const result: SyncResult = {
        success: remainingCount === 0,
        issues,
        fixed: fixedCount,
        remaining: remainingCount,
        message: this.buildMessage(issues, fixedCount, remainingCount, options),
      };

      this.ctx.eventBus.emit('operation:complete', {
        operation: opName,
        result: result as unknown,
        durationMs: Date.now() - startTime,
      });

      return ok(result);
    } catch (cause) {
      const error = new OperationError('Sync operation failed', { cause });
      this.ctx.eventBus.emit('operation:error', {
        operation: opName,
        error,
      });
      return err(error);
    }
  }

  private buildMessage(
    issues: readonly SyncIssue[],
    fixed: number,
    remaining: number,
    options?: Partial<SyncOptions>,
  ): string {
    if (issues.length === 0) {
      return 'All cognitives are in sync';
    }

    if (options?.dryRun === true) {
      return `Found ${issues.length} issue(s) (dry run, no changes applied)`;
    }

    const parts: string[] = [];
    if (fixed > 0) parts.push(`${fixed} issue(s) fixed`);
    if (remaining > 0) parts.push(`${remaining} issue(s) remaining`);
    return parts.join(', ');
  }
}
