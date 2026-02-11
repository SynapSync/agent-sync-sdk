import type { CognitError } from '../errors/base.js';
import type { Result } from '../types/result.js';
import type { OperationName } from '../types/events.js';
import type { OperationContext } from './context.js';
import { ok, err } from '../types/result.js';
import { OperationError } from '../errors/operation.js';

export abstract class BaseOperation {
  constructor(protected readonly ctx: OperationContext) {}

  protected executeWithLifecycle<TResult>(
    opName: OperationName,
    options: unknown,
    fn: () => Promise<TResult>,
  ): Promise<Result<TResult, CognitError>> {
    const start = Date.now();
    this.ctx.eventBus.emit('operation:start', { operation: opName, options });

    return fn().then(
      (result) => {
        this.ctx.eventBus.emit('operation:complete', {
          operation: opName,
          result,
          durationMs: Date.now() - start,
        });
        return ok(result);
      },
      (error: unknown) => {
        const opError =
          error instanceof OperationError
            ? error
            : new OperationError(
                error instanceof Error ? error.message : String(error),
                ...(error instanceof Error ? [{ cause: error }] : []),
              );
        this.ctx.eventBus.emit('operation:error', {
          operation: opName,
          error: opError,
        });
        return err(opError);
      },
    );
  }
}
