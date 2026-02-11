export interface RetryOptions {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5_000,
};

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_RETRY, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= opts.maxRetries) break;
      if (opts.shouldRetry && !opts.shouldRetry(error, attempt)) break;

      const delay = Math.min(
        opts.baseDelayMs * 2 ** attempt,
        opts.maxDelayMs,
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch network errors
  if (error instanceof DOMException && error.name === 'AbortError') return false; // user-cancelled
  const msg = (error instanceof Error) ? error.message : '';
  return /ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
