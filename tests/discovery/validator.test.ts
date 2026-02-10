import { describe, it, expect } from 'vitest';
import { CognitiveValidator } from '../../src/discovery/validator.js';
import { ValidationError } from '../../src/errors/discovery.js';
import { isOk, isErr } from '../../src/types/result.js';
import type { Cognitive, CognitiveType } from '../../src/types/cognitive.js';
import type { CognitiveName } from '../../src/types/brands.js';

function makeCognitive(overrides: Partial<{
  name: string;
  type: string;
  path: string;
  description: string;
  rawContent: string;
  metadata: Record<string, unknown>;
}>): Cognitive {
  return {
    name: 'test-cognitive' as CognitiveName,
    type: 'skill' as CognitiveType,
    path: '/skills/test-cognitive',
    description: 'A test cognitive',
    rawContent: '# Test',
    metadata: {},
    ...overrides,
  } as Cognitive;
}

describe('CognitiveValidator', () => {
  const validator = new CognitiveValidator();

  it('valid cognitive passes validation and returns ok()', () => {
    const cog = makeCognitive({});
    const result = validator.validate(cog);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(cog);
    }
  });

  it('empty name fails with ValidationError on "name"', () => {
    const cog = makeCognitive({ name: '' });
    const result = validator.validate(cog);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('name');
      expect(result.error.reason).toContain('non-empty');
    }
  });

  it('invalid type fails with ValidationError on "type"', () => {
    const cog = makeCognitive({ type: 'widget' });
    const result = validator.validate(cog);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('type');
      expect(result.error.reason).toContain('must be one of');
    }
  });

  it('empty path fails with ValidationError on "path"', () => {
    const cog = makeCognitive({ path: '' });
    const result = validator.validate(cog);
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.field).toBe('path');
      expect(result.error.reason).toContain('non-empty');
    }
  });

  it('all valid cognitive types pass validation', () => {
    for (const type of ['skill', 'agent', 'prompt', 'rule'] as const) {
      const cog = makeCognitive({ type });
      const result = validator.validate(cog);
      expect(isOk(result)).toBe(true);
    }
  });

  it('returns the same cognitive reference on success', () => {
    const cog = makeCognitive({});
    const result = validator.validate(cog);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(cog);
    }
  });

  it('returns err() with ValidationError on failure', () => {
    const result = validator.validate(makeCognitive({ name: '' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ValidationError);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    }
  });
});
