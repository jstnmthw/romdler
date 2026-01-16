import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, fetchHtml, fetchStream, isHttpError, HttpError } from '../src/http/index.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('http fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const defaultOptions = {
    userAgent: 'TestAgent/1.0',
    timeoutMs: 5000,
    retries: 2,
  };

  describe('fetchWithRetry', () => {
    it('returns successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('content'),
        body: null,
      });

      const result = await fetchWithRetry('https://example.com/', defaultOptions);

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 500 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('content'),
          body: null,
        });

      const promise = fetchWithRetry('https://example.com/', defaultOptions);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 503 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers(),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('content'),
          body: null,
        });

      const promise = fetchWithRetry('https://example.com/', defaultOptions);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: () => Promise.resolve(''),
        body: null,
      });

      const result = await fetchWithRetry('https://example.com/', defaultOptions);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws after exhausting retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      const promise = fetchWithRetry('https://example.com/', defaultOptions);

      // Attach a no-op catch to prevent unhandled rejection warning
      promise.catch(() => {});

      await vi.runAllTimersAsync();
      await expect(promise).rejects.toMatchObject({
        type: 'http',
        status: 500,
        retryable: true,
      });

      // Initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('retries on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('content'),
          body: null,
        });

      const promise = fetchWithRetry('https://example.com/', defaultOptions);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('handles timeout (AbortError)', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      mockFetch
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          text: () => Promise.resolve('content'),
          body: null,
        });

      const promise = fetchWithRetry('https://example.com/', defaultOptions);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('includes user agent header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('content'),
        body: null,
      });

      await fetchWithRetry('https://example.com/', defaultOptions);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/',
        expect.objectContaining({
          headers: { 'User-Agent': 'TestAgent/1.0' },
        })
      );
    });

    it('throws immediately on non-retryable error', async () => {
      // DNS resolution failures or SSL errors are non-retryable
      mockFetch.mockRejectedValueOnce(new Error('SSL certificate error'));

      await expect(fetchWithRetry('https://example.com/', defaultOptions)).rejects.toMatchObject({
        type: 'network',
        message: 'SSL certificate error',
        retryable: false,
      });

      // Should not retry
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('handles non-Error thrown values', async () => {
      // Some environments might throw non-Error values
      mockFetch.mockRejectedValueOnce('string error');

      await expect(fetchWithRetry('https://example.com/', defaultOptions)).rejects.toMatchObject({
        type: 'network',
        retryable: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchHtml', () => {
    it('returns html content on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        text: () => Promise.resolve('<html><body>Test</body></html>'),
        body: null,
      });

      const result = await fetchHtml('https://example.com/', defaultOptions);

      expect(result.html).toBe('<html><body>Test</body></html>');
      expect(result.status).toBe(200);
      expect(result.statusText).toBe('OK');
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        text: () => Promise.resolve(''),
        body: null,
      });

      await expect(fetchHtml('https://example.com/', defaultOptions)).rejects.toMatchObject({
        type: 'http',
        status: 404,
      });
    });
  });

  describe('fetchStream', () => {
    it('returns body stream and content length', async () => {
      const mockBody = new ReadableStream();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-length': '1024' }),
        body: mockBody,
      });

      const result = await fetchStream('https://example.com/file.zip', defaultOptions);

      expect(result.body).toBe(mockBody);
      expect(result.contentLength).toBe(1024);
      expect(result.status).toBe(200);
    });

    it('handles missing content-length', async () => {
      const mockBody = new ReadableStream();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: mockBody,
      });

      const result = await fetchStream('https://example.com/file.zip', defaultOptions);

      expect(result.contentLength).toBeNull();
    });

    it('throws on null body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        body: null,
      });

      await expect(fetchStream('https://example.com/file.zip', defaultOptions)).rejects.toMatchObject({
        type: 'network',
        message: 'Response body is null',
      });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers(),
        body: new ReadableStream(),
      });

      await expect(fetchStream('https://example.com/file.zip', defaultOptions)).rejects.toMatchObject({
        type: 'http',
        status: 403,
      });
    });
  });

  describe('isHttpError', () => {
    it('returns true for HttpError instances', () => {
      const error = new HttpError('http', 'test', false);
      expect(isHttpError(error)).toBe(true);
    });

    it('returns true for HttpError with status', () => {
      const error = new HttpError('http', 'Not Found', false, 404);
      expect(isHttpError(error)).toBe(true);
      expect(error.status).toBe(404);
    });

    it('returns false for regular errors', () => {
      expect(isHttpError(new Error('test'))).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isHttpError(null)).toBe(false);
      expect(isHttpError(undefined)).toBe(false);
    });

    it('returns false for plain objects with similar shape', () => {
      expect(isHttpError({ type: 'http', message: 'test', retryable: false })).toBe(false);
    });
  });
});
