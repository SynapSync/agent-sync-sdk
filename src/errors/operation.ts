import { CognitError } from './base.js';

export class OperationError extends CognitError {
  readonly code: string = 'OPERATION_ERROR';
  readonly module = 'operations';
}

export class ConflictError extends OperationError {
  override readonly code = 'CONFLICT_ERROR';

  constructor(
    readonly cognitiveName: string,
    readonly existingSource: string,
  ) {
    super(`Cognitive "${cognitiveName}" already exists from source: ${existingSource}`);
  }
}
