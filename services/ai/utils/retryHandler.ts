import { AIRetryOptions } from '../types';
import { sanitizeError } from './sanitizer';

/**
 * Checks whether an error indicates a transient, retryable failure.
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  const msg = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || error.response?.status;

  // Rate limit / Quota errors
  if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota')) {
    return true;
  }

  // Transient server errors
  if (status === 500 || status === 502 || status === 503 || status === 504 || msg.includes('unavailable') || msg.includes('overloaded')) {
    return true;
  }

  // Network timeouts & aborts
  if (
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('abort') ||
    error.name === 'AbortError'
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates exponential backoff delay with random jitter.
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs = 1000,
  maxDelayMs = 8000,
  factor = 2
): number {
  const baseDelay = initialDelayMs * Math.pow(factor, attempt);
  const cappedDelay = Math.min(baseDelay, maxDelayMs);
  // Add 10% - 30% jitter to prevent thundering herd
  const jitter = cappedDelay * (0.1 + Math.random() * 0.2);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleeps for a given duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an asynchronous operation with automated exponential backoff retry.
 */
export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: AIRetryOptions = {},
  onRetry?: (attempt: number, error: any, delayMs: number) => void
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 8000;
  const backoffFactor = options.backoffFactor ?? 2;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: any) {
      lastError = err;

      // Fail fast if not retryable or if we reached maximum retries
      if (!isRetryableError(err) || attempt >= maxRetries) {
        throw new Error(sanitizeError(err));
      }

      const delay = calculateBackoff(attempt, initialDelayMs, maxDelayMs, backoffFactor);
      if (onRetry) {
        onRetry(attempt + 1, err, delay);
      }
      await sleep(delay);
    }
  }

  throw new Error(sanitizeError(lastError));
}
