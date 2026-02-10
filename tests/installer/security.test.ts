import { describe, it, expect } from 'vitest';
import { sanitizeName, isPathSafe } from '../../src/installer/security.js';

describe('sanitizeName()', () => {
  it('lowercases and converts spaces to hyphens', () => {
    expect(sanitizeName('My Cool Skill')).toBe('my-cool-skill');
  });

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(sanitizeName('react@best!practices')).toBe('react-best-practices');
  });

  it('returns fallback for path traversal sequences', () => {
    expect(sanitizeName('../etc/passwd')).toBe('unnamed-cognitive');
    expect(sanitizeName('./hidden')).toBe('unnamed-cognitive');
  });

  it('returns fallback for empty or null-byte strings', () => {
    expect(sanitizeName('')).toBe('unnamed-cognitive');
    expect(sanitizeName('bad\0name')).toBe('unnamed-cognitive');
  });

  it('returns fallback for names with slashes', () => {
    expect(sanitizeName('foo/bar')).toBe('unnamed-cognitive');
    expect(sanitizeName('foo\\bar')).toBe('unnamed-cognitive');
  });

  it('truncates names longer than 255 characters', () => {
    const longName = 'a'.repeat(300);
    const result = sanitizeName(longName);
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result).toBe('a'.repeat(255));
  });

  it('strips leading/trailing dots and hyphens', () => {
    expect(sanitizeName('--hello--')).toBe('hello');
    expect(sanitizeName('..hidden..')).toBe('hidden');
  });

  it('collapses consecutive hyphens', () => {
    expect(sanitizeName('a---b---c')).toBe('a-b-c');
  });
});

describe('isPathSafe()', () => {
  it('returns true for a path within the base', () => {
    expect(isPathSafe('/project', '/project/agents/skill')).toBe(true);
  });

  it('returns false for a path traversal attempt', () => {
    expect(isPathSafe('/project', '/project/../etc/passwd')).toBe(false);
  });

  it('returns true when target equals base', () => {
    expect(isPathSafe('/project', '/project')).toBe(true);
  });

  it('returns false when target is a sibling directory', () => {
    expect(isPathSafe('/project/agents', '/project/other')).toBe(false);
  });
});
