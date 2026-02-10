import { describe, it, expect } from 'vitest';

import { CognitError } from '../../src/errors/base.js';

import { ConfigError, ConfigNotFoundError, InvalidConfigError } from '../../src/errors/config.js';
import {
  ProviderError,
  ProviderFetchError,
  ProviderMatchError,
  NoCognitivesFoundError,
} from '../../src/errors/provider.js';
import {
  InstallError,
  PathTraversalError,
  SymlinkError,
  FileWriteError,
  EloopError,
} from '../../src/errors/install.js';
import { LockError, LockReadError, LockWriteError, LockMigrationError } from '../../src/errors/lock.js';
import { DiscoveryError, ParseError, ScanError, ValidationError } from '../../src/errors/discovery.js';
import { OperationError, ConflictError } from '../../src/errors/operation.js';
import { SourceError, SourceParseError, GitCloneError } from '../../src/errors/source.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect { code, instance } for every concrete error class in the hierarchy */
function allConcreteErrors(): Array<{ code: string; error: CognitError }> {
  return [
    // Config
    { code: 'CONFIG_ERROR', error: new ConfigError('base') },
    { code: 'CONFIG_NOT_FOUND', error: new ConfigNotFoundError('/a/b') },
    { code: 'INVALID_CONFIG_ERROR', error: new InvalidConfigError('field', 'reason') },
    // Provider
    { code: 'PROVIDER_ERROR', error: new ProviderError('msg', 'gh') },
    { code: 'PROVIDER_FETCH_ERROR', error: new ProviderFetchError('https://x', 'gh', 404) },
    { code: 'PROVIDER_MATCH_ERROR', error: new ProviderMatchError('no match', 'gh') },
    { code: 'NO_COGNITIVES_FOUND', error: new NoCognitivesFoundError('src', 'gh') },
    // Install
    { code: 'INSTALL_ERROR', error: new InstallError('base') },
    { code: 'PATH_TRAVERSAL_ERROR', error: new PathTraversalError('../etc') },
    { code: 'SYMLINK_ERROR', error: new SymlinkError('/a', '/b') },
    { code: 'FILE_WRITE_ERROR', error: new FileWriteError('/tmp/f') },
    { code: 'ELOOP_ERROR', error: new EloopError('/link') },
    // Lock
    { code: 'LOCK_ERROR', error: new LockError('base') },
    { code: 'LOCK_READ_ERROR', error: new LockReadError('/lock') },
    { code: 'LOCK_WRITE_ERROR', error: new LockWriteError('/lock') },
    { code: 'LOCK_MIGRATION_ERROR', error: new LockMigrationError(1, 2) },
    // Discovery
    { code: 'DISCOVERY_ERROR', error: new DiscoveryError('base') },
    { code: 'PARSE_ERROR', error: new ParseError('/file.md') },
    { code: 'SCAN_ERROR', error: new ScanError('/dir') },
    { code: 'VALIDATION_ERROR', error: new ValidationError('f', 'r') },
    // Operation
    { code: 'OPERATION_ERROR', error: new OperationError('base') },
    { code: 'CONFLICT_ERROR', error: new ConflictError('my-skill', 'github:owner/repo') },
    // Source
    { code: 'SOURCE_ERROR', error: new SourceError('base') },
    { code: 'SOURCE_PARSE_ERROR', error: new SourceParseError('bad://') },
    { code: 'GIT_CLONE_ERROR', error: new GitCloneError('https://x', 'timeout') },
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Error hierarchy', () => {
  // ---- Config errors ----
  describe('ConfigError family', () => {
    it('ConfigError has correct code, module, and name', () => {
      const e = new ConfigError('boom');
      expect(e.code).toBe('CONFIG_ERROR');
      expect(e.module).toBe('config');
      expect(e.name).toBe('ConfigError');
      expect(e.message).toBe('boom');
    });

    it('ConfigNotFoundError stores configPath', () => {
      const e = new ConfigNotFoundError('/some/path');
      expect(e.code).toBe('CONFIG_NOT_FOUND');
      expect(e.configPath).toBe('/some/path');
      expect(e.message).toContain('/some/path');
      expect(e).toBeInstanceOf(ConfigError);
      expect(e).toBeInstanceOf(CognitError);
      expect(e).toBeInstanceOf(Error);
    });

    it('InvalidConfigError stores field and reason', () => {
      const e = new InvalidConfigError('cwd', 'must be absolute');
      expect(e.code).toBe('INVALID_CONFIG_ERROR');
      expect(e.field).toBe('cwd');
      expect(e.reason).toBe('must be absolute');
      expect(e.message).toContain('cwd');
      expect(e.message).toContain('must be absolute');
    });
  });

  // ---- Provider errors ----
  describe('ProviderError family', () => {
    it('ProviderError stores providerId', () => {
      const e = new ProviderError('msg', 'github');
      expect(e.code).toBe('PROVIDER_ERROR');
      expect(e.module).toBe('providers');
      expect(e.providerId).toBe('github');
    });

    it('ProviderFetchError with statusCode', () => {
      const e = new ProviderFetchError('https://api.github.com', 'github', 404);
      expect(e.code).toBe('PROVIDER_FETCH_ERROR');
      expect(e.url).toBe('https://api.github.com');
      expect(e.statusCode).toBe(404);
      expect(e.providerId).toBe('github');
      expect(e.message).toContain('404');
    });

    it('ProviderFetchError without statusCode falls back to "network error"', () => {
      const e = new ProviderFetchError('https://x', 'github');
      expect(e.statusCode).toBeUndefined();
      expect(e.message).toContain('network error');
    });

    it('ProviderFetchError instanceof chain', () => {
      const e = new ProviderFetchError('u', 'gh', 500);
      expect(e).toBeInstanceOf(ProviderFetchError);
      expect(e).toBeInstanceOf(ProviderError);
      expect(e).toBeInstanceOf(CognitError);
      expect(e).toBeInstanceOf(Error);
    });

    it('ProviderMatchError has correct code', () => {
      const e = new ProviderMatchError('no match', 'custom');
      expect(e.code).toBe('PROVIDER_MATCH_ERROR');
      expect(e.name).toBe('ProviderMatchError');
    });

    it('NoCognitivesFoundError stores source', () => {
      const e = new NoCognitivesFoundError('owner/repo', 'github');
      expect(e.code).toBe('NO_COGNITIVES_FOUND');
      expect(e.source).toBe('owner/repo');
      expect(e.message).toContain('owner/repo');
    });
  });

  // ---- Install errors ----
  describe('InstallError family', () => {
    it('PathTraversalError stores attemptedPath', () => {
      const e = new PathTraversalError('../../../etc/passwd');
      expect(e.code).toBe('PATH_TRAVERSAL_ERROR');
      expect(e.attemptedPath).toBe('../../../etc/passwd');
      expect(e).toBeInstanceOf(InstallError);
      expect(e).toBeInstanceOf(CognitError);
    });

    it('SymlinkError stores source and target', () => {
      const e = new SymlinkError('/canonical/skill', '/agent/skill');
      expect(e.code).toBe('SYMLINK_ERROR');
      expect(e.source).toBe('/canonical/skill');
      expect(e.target).toBe('/agent/skill');
      expect(e.message).toContain('/canonical/skill');
      expect(e.message).toContain('/agent/skill');
    });

    it('SymlinkError supports cause', () => {
      const cause = new Error('EPERM');
      const e = new SymlinkError('/a', '/b', { cause });
      expect(e.cause).toBe(cause);
    });

    it('FileWriteError stores filePath and supports cause', () => {
      const cause = new Error('ENOSPC');
      const e = new FileWriteError('/tmp/file', { cause });
      expect(e.code).toBe('FILE_WRITE_ERROR');
      expect(e.filePath).toBe('/tmp/file');
      expect(e.cause).toBe(cause);
    });

    it('EloopError stores symlinkPath', () => {
      const e = new EloopError('/link');
      expect(e.code).toBe('ELOOP_ERROR');
      expect(e.symlinkPath).toBe('/link');
      expect(e.message).toContain('/link');
    });
  });

  // ---- Lock errors ----
  describe('LockError family', () => {
    it('LockReadError stores lockPath', () => {
      const e = new LockReadError('/lock.json');
      expect(e.code).toBe('LOCK_READ_ERROR');
      expect(e.lockPath).toBe('/lock.json');
      expect(e).toBeInstanceOf(LockError);
    });

    it('LockWriteError stores lockPath and supports cause', () => {
      const cause = new Error('EACCES');
      const e = new LockWriteError('/lock.json', { cause });
      expect(e.code).toBe('LOCK_WRITE_ERROR');
      expect(e.lockPath).toBe('/lock.json');
      expect(e.cause).toBe(cause);
    });

    it('LockMigrationError stores fromVersion and toVersion', () => {
      const e = new LockMigrationError(1, 3);
      expect(e.code).toBe('LOCK_MIGRATION_ERROR');
      expect(e.fromVersion).toBe(1);
      expect(e.toVersion).toBe(3);
      expect(e.message).toContain('v1');
      expect(e.message).toContain('v3');
    });

    it('LockMigrationError supports cause', () => {
      const cause = new Error('schema change');
      const e = new LockMigrationError(2, 4, { cause });
      expect(e.cause).toBe(cause);
    });
  });

  // ---- Discovery errors ----
  describe('DiscoveryError family', () => {
    it('ParseError stores filePath', () => {
      const e = new ParseError('/bad.md');
      expect(e.code).toBe('PARSE_ERROR');
      expect(e.filePath).toBe('/bad.md');
      expect(e).toBeInstanceOf(DiscoveryError);
    });

    it('ScanError stores directory and supports cause', () => {
      const cause = new Error('EACCES');
      const e = new ScanError('/secret', { cause });
      expect(e.code).toBe('SCAN_ERROR');
      expect(e.directory).toBe('/secret');
      expect(e.cause).toBe(cause);
    });

    it('ValidationError stores field and reason', () => {
      const e = new ValidationError('name', 'must be non-empty');
      expect(e.code).toBe('VALIDATION_ERROR');
      expect(e.field).toBe('name');
      expect(e.reason).toBe('must be non-empty');
    });
  });

  // ---- Operation errors ----
  describe('OperationError family', () => {
    it('ConflictError stores cognitiveName and existingSource', () => {
      const e = new ConflictError('react-rules', 'github:owner/repo');
      expect(e.code).toBe('CONFLICT_ERROR');
      expect(e.cognitiveName).toBe('react-rules');
      expect(e.existingSource).toBe('github:owner/repo');
      expect(e).toBeInstanceOf(OperationError);
      expect(e).toBeInstanceOf(CognitError);
    });
  });

  // ---- Source errors ----
  describe('SourceError family', () => {
    it('SourceParseError stores rawSource and supports cause', () => {
      const cause = new Error('invalid URL');
      const e = new SourceParseError('bad://url', { cause });
      expect(e.code).toBe('SOURCE_PARSE_ERROR');
      expect(e.rawSource).toBe('bad://url');
      expect(e.cause).toBe(cause);
      expect(e).toBeInstanceOf(SourceError);
    });

    it('GitCloneError stores url and reason', () => {
      const e = new GitCloneError('https://github.com/x', 'auth failed');
      expect(e.code).toBe('GIT_CLONE_ERROR');
      expect(e.url).toBe('https://github.com/x');
      expect(e.reason).toBe('auth failed');
      expect(e.message).toContain('auth failed');
    });

    it('GitCloneError supports cause', () => {
      const cause = new Error('ETIMEDOUT');
      const e = new GitCloneError('https://x', 'timeout', { cause });
      expect(e.cause).toBe(cause);
    });
  });

  // ---- toJSON ----
  describe('toJSON()', () => {
    it('returns structured output for every error', () => {
      for (const { code, error } of allConcreteErrors()) {
        const json = error.toJSON();
        expect(json).toHaveProperty('name', error.constructor.name);
        expect(json).toHaveProperty('code', code);
        expect(json).toHaveProperty('module');
        expect(json).toHaveProperty('message');
      }
    });

    it('includes cause when present', () => {
      const cause = new Error('root');
      const e = new LockReadError('/lock', { cause });
      const json = e.toJSON();
      expect(json.cause).toBe(cause);
    });

    it('cause is undefined when not provided', () => {
      const e = new LockReadError('/lock');
      const json = e.toJSON();
      expect(json.cause).toBeUndefined();
    });
  });

  // ---- Unique codes ----
  describe('error codes are unique', () => {
    it('no two error classes share the same code', () => {
      const entries = allConcreteErrors();
      const codes = entries.map((e) => e.code);
      expect(new Set(codes).size).toBe(codes.length);
    });
  });

  // ---- Cross-cutting instanceof ----
  describe('instanceof chains', () => {
    it('every error is instanceof CognitError and Error', () => {
      for (const { error } of allConcreteErrors()) {
        expect(error).toBeInstanceOf(CognitError);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  // ---- name property ----
  describe('name property', () => {
    it('every error.name matches its constructor name', () => {
      for (const { error } of allConcreteErrors()) {
        expect(error.name).toBe(error.constructor.name);
      }
    });
  });
});
