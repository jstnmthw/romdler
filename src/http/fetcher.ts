import type { FetchOptions, FetchResult } from './types.js';
import { HttpError } from './types.js';

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number): number {
  const delay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 200;
  return Math.min(delay + jitter, MAX_DELAY_MS);
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch failed') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('etimedout') ||
      message.includes('socket hang up')
    );
  }
  return false;
}

/**
 * Fetches a URL with retry logic and timeout support.
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions
): Promise<FetchResult> {
  let lastError: HttpError | null = null;

  for (let attempt = 0; attempt <= options.retries; attempt++) {
    if (attempt > 0) {
      const delay = calculateBackoff(attempt - 1);
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, options.timeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': options.userAgent,
        },
      });

      clearTimeout(timeoutId);

      // Check for retryable status codes
      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        // Cancel/consume the response body to free resources
        await response.body?.cancel();
        lastError = new HttpError(
          'http',
          `HTTP ${response.status}: ${response.statusText}`,
          true,
          response.status
        );
        continue;
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        text: () => response.text(),
        body: response.body,
      };
    } catch (err) {
      const error = err as Error;

      // Handle timeout
      if (error.name === 'AbortError') {
        lastError = new HttpError(
          'timeout',
          `Request timed out after ${options.timeoutMs}ms`,
          true
        );
        continue;
      }

      // Handle network errors
      if (isRetryableError(error)) {
        lastError = new HttpError('network', error.message, true);
        continue;
      }

      // Non-retryable error
      throw new HttpError('network', error.message, false);
    }
  }

  // All retries exhausted
  if (lastError !== null) {
    throw lastError;
  }

  throw new HttpError('network', 'Unknown error', false);
}

/**
 * Fetches HTML content from a URL.
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions
): Promise<{ html: string; status: number; statusText: string }> {
  const result = await fetchWithRetry(url, options);

  if (!result.ok) {
    throw new HttpError(
      'http',
      `HTTP ${result.status}: ${result.statusText}`,
      false,
      result.status
    );
  }

  const html = await result.text();
  return { html, status: result.status, statusText: result.statusText };
}

/**
 * Initiates a streaming download, returning the response for streaming to disk.
 */
export async function fetchStream(
  url: string,
  options: FetchOptions
): Promise<{
  body: ReadableStream<Uint8Array>;
  contentLength: number | null;
  status: number;
}> {
  const result = await fetchWithRetry(url, options);

  if (!result.ok) {
    throw new HttpError(
      'http',
      `HTTP ${result.status}: ${result.statusText}`,
      false,
      result.status
    );
  }

  if (result.body === null) {
    throw new HttpError('network', 'Response body is null', false);
  }

  const contentLengthHeader = result.headers.get('content-length');
  const contentLength =
    contentLengthHeader !== null ? parseInt(contentLengthHeader, 10) : null;

  return {
    body: result.body,
    contentLength: contentLength !== null && !isNaN(contentLength) ? contentLength : null,
    status: result.status,
  };
}
