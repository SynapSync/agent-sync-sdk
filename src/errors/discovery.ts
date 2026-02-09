import { CognitError } from './base.js';

export class DiscoveryError extends CognitError {
  readonly code: string = 'DISCOVERY_ERROR';
  readonly module = 'discovery';
}

export class ParseError extends DiscoveryError {
  override readonly code = 'PARSE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Failed to parse cognitive file: ${filePath}`, options);
  }
}

export class ScanError extends DiscoveryError {
  override readonly code = 'SCAN_ERROR';

  constructor(readonly directory: string, options?: ErrorOptions) {
    super(`Failed to scan directory: ${directory}`, options);
  }
}

export class ValidationError extends DiscoveryError {
  override readonly code = 'VALIDATION_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Validation failed: ${field} -- ${reason}`);
  }
}
