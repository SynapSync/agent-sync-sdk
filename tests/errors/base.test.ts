import { describe, it, expect } from 'vitest';
import { CognitError } from '../../src/errors/base.js';
import { ProviderError, ProviderFetchError } from '../../src/errors/provider.js';
import { InstallError, PathTraversalError } from '../../src/errors/install.js';
import { LockReadError, LockMigrationError } from '../../src/errors/lock.js';
import { InvalidConfigError } from '../../src/errors/config.js';

describe('Error Hierarchy', () => {
  it('CognitError subclasses preserve code and module', () => {
    const error = new ProviderError('test', 'github');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.module).toBe('providers');
    expect(error.message).toBe('test');
  });

  it('error name matches constructor name', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    expect(error.name).toBe('ProviderFetchError');
  });

  it('toJSON() returns structured object', () => {
    const error = new InvalidConfigError('cwd', 'must be absolute path');
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'InvalidConfigError',
      code: 'INVALID_CONFIG_ERROR',
      module: 'config',
      message: 'Invalid config: cwd -- must be absolute path',
      cause: undefined,
    });
  });

  it('supports cause chaining', () => {
    const rootCause = new Error('ENOENT');
    const error = new LockReadError('/path/to/lock', { cause: rootCause });
    expect(error.cause).toBe(rootCause);
  });

  it('instanceof hierarchy works for providers', () => {
    const error = new ProviderFetchError('url', 'github', 500);
    expect(error).toBeInstanceOf(ProviderFetchError);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toBeInstanceOf(CognitError);
    expect(error).toBeInstanceOf(Error);
  });

  it('instanceof hierarchy works for installer', () => {
    const error = new PathTraversalError('../../../etc/passwd');
    expect(error).toBeInstanceOf(PathTraversalError);
    expect(error).toBeInstanceOf(InstallError);
    expect(error).toBeInstanceOf(CognitError);
  });

  it('lock migration error stores version info', () => {
    const error = new LockMigrationError(3, 5);
    expect(error.fromVersion).toBe(3);
    expect(error.toVersion).toBe(5);
    expect(error.code).toBe('LOCK_MIGRATION_ERROR');
  });
});
