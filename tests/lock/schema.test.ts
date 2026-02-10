import { describe, it, expect } from 'vitest';
import {
  makeLockKey,
  parseLockKey,
  createEmptyLockFile,
  validateLockFile,
  CURRENT_LOCK_VERSION,
} from '../../src/lock/schema.js';

describe('makeLockKey()', () => {
  it('creates a key in the format type:name', () => {
    expect(makeLockKey('skill', 'react-best-practices')).toBe('skill:react-best-practices');
    expect(makeLockKey('agent', 'my-agent')).toBe('agent:my-agent');
  });
});

describe('parseLockKey()', () => {
  it('parses a valid skill key', () => {
    const result = parseLockKey('skill:my-skill');
    expect(result).toEqual({ cognitiveType: 'skill', name: 'my-skill' });
  });

  it('parses all valid cognitive types', () => {
    expect(parseLockKey('agent:a')?.cognitiveType).toBe('agent');
    expect(parseLockKey('prompt:p')?.cognitiveType).toBe('prompt');
    expect(parseLockKey('rule:r')?.cognitiveType).toBe('rule');
  });

  it('returns null for a key without a colon', () => {
    expect(parseLockKey('invalidkey')).toBeNull();
  });

  it('returns null for an unknown cognitive type', () => {
    expect(parseLockKey('unknown:name')).toBeNull();
  });

  it('returns null for a key with empty name', () => {
    expect(parseLockKey('skill:')).toBeNull();
  });
});

describe('createEmptyLockFile()', () => {
  it('returns a lock file at the current version with empty cognitives', () => {
    const lock = createEmptyLockFile();
    expect(lock.version).toBe(CURRENT_LOCK_VERSION);
    expect(lock.cognitives).toEqual({});
  });
});

describe('validateLockFile()', () => {
  it('returns true for a valid lock file shape', () => {
    expect(validateLockFile({ version: 5, cognitives: {} })).toBe(true);
  });

  it('returns false when version is missing', () => {
    expect(validateLockFile({ cognitives: {} })).toBe(false);
  });

  it('returns false when cognitives is missing', () => {
    expect(validateLockFile({ version: 5 })).toBe(false);
  });

  it('returns false when cognitives is an array', () => {
    expect(validateLockFile({ version: 5, cognitives: [] })).toBe(false);
  });

  it('returns false for null or non-object input', () => {
    expect(validateLockFile(null)).toBe(false);
    expect(validateLockFile('string')).toBe(false);
    expect(validateLockFile(42)).toBe(false);
  });
});
