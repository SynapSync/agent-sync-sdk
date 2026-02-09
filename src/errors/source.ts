import { CognitError } from './base.js';

export class SourceError extends CognitError {
  readonly code: string = 'SOURCE_ERROR';
  readonly module = 'source';
}

export class SourceParseError extends SourceError {
  override readonly code = 'SOURCE_PARSE_ERROR';

  constructor(readonly rawSource: string, options?: ErrorOptions) {
    super(`Failed to parse source: "${rawSource}"`, options);
  }
}

/** Alias for InvalidSourceError */
export { SourceParseError as InvalidSourceError };

export class GitCloneError extends SourceError {
  override readonly code = 'GIT_CLONE_ERROR';

  constructor(
    readonly url: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to clone ${url}: ${reason}`, options);
  }
}
