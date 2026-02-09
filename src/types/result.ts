import type { CognitError } from '../errors/base.js';

/**
 * Discriminated union for operations that can fail with expected errors.
 * Use this instead of throwing for recoverable failures.
 */
export type Result<T, E extends CognitError = CognitError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Create a success result */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failure result */
export function err<E extends CognitError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Unwrap a result or throw the error */
export function unwrap<T, E extends CognitError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Map the success value of a result */
export function mapResult<T, U, E extends CognitError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}

/** Type guard: is this result a success? */
export function isOk<T, E extends CognitError>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/** Type guard: is this result a failure? */
export function isErr<T, E extends CognitError>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}
