import { CognitError } from './base.js';

export class ConfigError extends CognitError {
  readonly code: string = 'CONFIG_ERROR';
  readonly module = 'config';
}

export class ConfigNotFoundError extends ConfigError {
  override readonly code = 'CONFIG_NOT_FOUND';

  constructor(readonly configPath: string) {
    super(`Config file not found: ${configPath}`);
  }
}

export class InvalidConfigError extends ConfigError {
  override readonly code = 'INVALID_CONFIG_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Invalid config: ${field} -- ${reason}`);
  }
}

/** Alias for consistency with naming conventions */
export { InvalidConfigError as ConfigValidationError };
