import { join } from 'node:path';
import type { CognitError } from '../errors/base.js';
import type { Result } from '../types/result.js';
import type {
  CheckOptions,
  CheckResult,
  CheckIssue,
} from '../types/operations.js';
import type { OperationContext } from './context.js';
import { ok, err } from '../types/result.js';
import { OperationError } from '../errors/operation.js';
import { COGNITIVE_SUBDIRS } from '../types/cognitive.js';
import { sanitizeName } from '../installer/security.js';
import { verifyContentHash } from '../lock/integrity.js';

export class CheckOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(
    options?: Partial<CheckOptions>,
  ): Promise<Result<CheckResult, CognitError>> {
    const startTime = Date.now();
    const opName = 'check';

    this.ctx.eventBus.emit('operation:start', {
      operation: opName,
      options: options as unknown,
    });

    try {
      const allEntries = await this.ctx.lockManager.getAllEntries();
      const healthy: string[] = [];
      const issues: CheckIssue[] = [];

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
          issues.push({
            name,
            type: 'missing_canonical',
            description: `Canonical path does not exist: ${canonicalPath}`,
            severity: 'error',
          });
          continue;
        }

        const hashValid = await verifyContentHash(
          canonicalPath,
          entry.contentHash,
          this.ctx.config.fs,
        );

        if (!hashValid) {
          issues.push({
            name,
            type: 'hash_mismatch',
            description: `Content hash mismatch for "${name}" at ${canonicalPath}`,
            severity: 'warning',
          });
          continue;
        }

        healthy.push(name);
      }

      const result: CheckResult = {
        success: issues.length === 0,
        healthy,
        issues,
        message: this.buildMessage(healthy, issues),
      };

      this.ctx.eventBus.emit('operation:complete', {
        operation: opName,
        result: result as unknown,
        durationMs: Date.now() - startTime,
      });

      return ok(result);
    } catch (cause) {
      const error = new OperationError('Check operation failed', { cause });
      this.ctx.eventBus.emit('operation:error', {
        operation: opName,
        error,
      });
      return err(error);
    }
  }

  private buildMessage(
    healthy: readonly string[],
    issues: readonly CheckIssue[],
  ): string {
    if (issues.length === 0) {
      return `All ${healthy.length} cognitive(s) are healthy`;
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    const parts: string[] = [];
    if (healthy.length > 0) parts.push(`${healthy.length} healthy`);
    if (errorCount > 0) parts.push(`${errorCount} error(s)`);
    if (warningCount > 0) parts.push(`${warningCount} warning(s)`);
    return parts.join(', ');
  }
}
