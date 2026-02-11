import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableNetworkError, DEFAULT_RETRY } from '../../src/utils/retry.js';

describe('withRetry', () => {
  it('returns on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(0);
  });

  it('retries on failure and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { baseDelayMs: 1, maxDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, 0);
    expect(fn).toHaveBeenNthCalledWith(2, 1);
    expect(fn).toHaveBeenNthCalledWith(3, 2);
  });

  it('throws last error after all retries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent'));

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 })).rejects.toThrow(
      'persistent',
    );
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('respects shouldRetry to stop early', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'));

    await expect(
      withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 1,
        shouldRetry: () => false,
      }),
    ).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff delays', async () => {
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      delays.push(ms ?? 0);
      return origSetTimeout(fn, 0); // execute immediately
    });

    const fnMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');

    await withRetry(fnMock, { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 5000 });

    // 100 * 2^0 = 100, 100 * 2^1 = 200
    expect(delays).toEqual([100, 200]);

    vi.restoreAllMocks();
  });

  it('caps delay at maxDelayMs', async () => {
    const delays: number[] = [];
    const origSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      delays.push(ms ?? 0);
      return origSetTimeout(fn, 0);
    });

    const fnMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');

    await withRetry(fnMock, { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 1500 });

    // 1000 * 2^0 = 1000, min(1000 * 2^1, 1500) = 1500
    expect(delays).toEqual([1000, 1500]);

    vi.restoreAllMocks();
  });

  it('has sensible defaults', () => {
    expect(DEFAULT_RETRY.maxRetries).toBe(2);
    expect(DEFAULT_RETRY.baseDelayMs).toBe(500);
    expect(DEFAULT_RETRY.maxDelayMs).toBe(5_000);
  });
});

describe('isRetryableNetworkError', () => {
  it('returns true for TypeError (fetch network errors)', () => {
    expect(isRetryableNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns false for AbortError (user cancellation)', () => {
    const err = new DOMException('signal timed out', 'AbortError');
    expect(isRetryableNetworkError(err)).toBe(false);
  });

  it('returns true for ECONNRESET', () => {
    const err = new Error('read ECONNRESET');
    expect(isRetryableNetworkError(err)).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    const err = new Error('connect ETIMEDOUT 1.2.3.4:443');
    expect(isRetryableNetworkError(err)).toBe(true);
  });

  it('returns true for ECONNREFUSED', () => {
    const err = new Error('connect ECONNREFUSED');
    expect(isRetryableNetworkError(err)).toBe(true);
  });

  it('returns false for generic errors', () => {
    expect(isRetryableNetworkError(new Error('something went wrong'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isRetryableNetworkError('string')).toBe(false);
    expect(isRetryableNetworkError(null)).toBe(false);
  });
});
