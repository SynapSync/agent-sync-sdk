import type { SDKConfig } from '../types/config.js';
import { InvalidConfigError } from '../errors/config.js';

export function validateConfig(config: SDKConfig): void {
  if (!config.agentsDir) {
    throw new InvalidConfigError('agentsDir', 'must be non-empty');
  }
  if (!config.lockFileName || !config.lockFileName.endsWith('.json')) {
    throw new InvalidConfigError('lockFileName', 'must be non-empty and end with .json');
  }
  if (config.git.cloneTimeoutMs <= 0) {
    throw new InvalidConfigError('git.cloneTimeoutMs', 'must be positive');
  }
  if (config.git.depth <= 0 || !Number.isInteger(config.git.depth)) {
    throw new InvalidConfigError('git.depth', 'must be a positive integer');
  }
}
