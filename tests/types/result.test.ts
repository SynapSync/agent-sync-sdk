import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, mapResult, isOk, isErr } from '../../src/types/result.js';
import { CognitError } from '../../src/errors/base.js';

class TestError extends CognitError {
  readonly code = 'TEST_ERROR';
  readonly module = 'test';
}

describe('Result<T, E>', () => {
  describe('ok()', () => {
    it('creates a success result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  describe('err()', () => {
    it('creates a failure result', () => {
      const error = new TestError('something failed');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('unwrap()', () => {
    it('returns value for ok result', () => {
      expect(unwrap(ok('hello'))).toBe('hello');
    });

    it('throws for err result', () => {
      const error = new TestError('fail');
      expect(() => unwrap(err(error))).toThrow(error);
    });
  });

  describe('mapResult()', () => {
    it('transforms success value', () => {
      const result = mapResult(ok(10), (v) => v * 2);
      expect(result).toEqual({ ok: true, value: 20 });
    });

    it('passes through error unchanged', () => {
      const error = new TestError('fail');
      const result = mapResult(err(error), (v: number) => v * 2);
      expect(result).toEqual({ ok: false, error });
    });
  });

  describe('isOk() / isErr()', () => {
    it('isOk returns true for ok results', () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err(new TestError('f')))).toBe(false);
    });

    it('isErr returns true for err results', () => {
      expect(isErr(err(new TestError('f')))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });
  });
});
