import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Mock the http module
vi.mock('../src/http/index.js', async () => {
  const actual = await vi.importActual('../src/http/index.js');
  return {
    ...actual,
    fetchStream: vi.fn(),
  };
});

import { downloadFile, downloadSequential, downloadConcurrent } from '../src/downloader/index.js';
import { fetchStream, HttpError } from '../src/http/index.js';

const mockFetchStream = vi.mocked(fetchStream);

const TEST_DIR = join(process.cwd(), '.test-downloads');

function createMockStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

describe('downloader', () => {
  const defaultOptions = {
    userAgent: 'TestAgent/1.0',
    timeoutMs: 5000,
    retries: 2,
    downloadDir: TEST_DIR,
  };

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mockFetchStream.mockReset();
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('downloadFile', () => {
    it('downloads file successfully', async () => {
      const content = 'file content here';
      mockFetchStream.mockResolvedValue({
        body: createMockStream(content),
        contentLength: content.length,
        status: 200,
      });

      const result = await downloadFile('https://example.com/file.zip', 'file.zip', defaultOptions);

      expect(result.status).toBe('downloaded');
      expect(result.filename).toBe('file.zip');
      expect(existsSync(join(TEST_DIR, 'file.zip'))).toBe(true);
      expect(readFileSync(join(TEST_DIR, 'file.zip'), 'utf-8')).toBe(content);
    });

    it('skips existing file with matching size', async () => {
      const content = 'existing content';
      writeFileSync(join(TEST_DIR, 'existing.zip'), content);

      mockFetchStream.mockResolvedValue({
        body: createMockStream(content),
        contentLength: content.length,
        status: 200,
      });

      const result = await downloadFile(
        'https://example.com/existing.zip',
        'existing.zip',
        defaultOptions
      );

      expect(result.status).toBe('skipped');
      expect(result.bytesDownloaded).toBe(0);
    });

    it('skips existing file when size check fails', async () => {
      const content = 'existing content';
      writeFileSync(join(TEST_DIR, 'existing.zip'), content);

      mockFetchStream.mockRejectedValue(new Error('Network error'));

      const result = await downloadFile(
        'https://example.com/existing.zip',
        'existing.zip',
        defaultOptions
      );

      expect(result.status).toBe('skipped');
    });

    it('re-downloads existing file when size differs', async () => {
      const existingContent = 'short';
      const newContent = 'much longer content here';
      writeFileSync(join(TEST_DIR, 'partial.zip'), existingContent);

      // First call (size check) returns different content-length
      // Second call (actual download) returns the new content
      mockFetchStream
        .mockResolvedValueOnce({
          body: createMockStream(''),
          contentLength: newContent.length, // Different from existing file
          status: 200,
        })
        .mockResolvedValueOnce({
          body: createMockStream(newContent),
          contentLength: newContent.length,
          status: 200,
        });

      const result = await downloadFile(
        'https://example.com/partial.zip',
        'partial.zip',
        defaultOptions
      );

      expect(result.status).toBe('downloaded');
      expect(readFileSync(join(TEST_DIR, 'partial.zip'), 'utf-8')).toBe(newContent);
    });

    it('returns failed status on download error', async () => {
      mockFetchStream.mockRejectedValue(new HttpError('http', 'HTTP 404: Not Found', false, 404));

      const result = await downloadFile(
        'https://example.com/missing.zip',
        'missing.zip',
        defaultOptions
      );

      expect(result.status).toBe('failed');
      expect(result.error).toBe('HTTP 404: Not Found');
    });

    it('handles generic errors', async () => {
      mockFetchStream.mockRejectedValue(new Error('Something went wrong'));

      const result = await downloadFile('https://example.com/file.zip', 'file.zip', defaultOptions);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Something went wrong');
    });

    it('calls progress callback during download', async () => {
      const content = 'file content';
      mockFetchStream.mockResolvedValue({
        body: createMockStream(content),
        contentLength: content.length,
        status: 200,
      });

      const onProgress = vi.fn();

      await downloadFile('https://example.com/file.zip', 'file.zip', defaultOptions, onProgress);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'file.zip',
          bytesDownloaded: expect.any(Number),
        })
      );
    });

    it('sanitizes filename for safety', async () => {
      const content = 'content';
      mockFetchStream.mockResolvedValue({
        body: createMockStream(content),
        contentLength: content.length,
        status: 200,
      });

      const result = await downloadFile(
        'https://example.com/file.zip',
        '../../../etc/passwd',
        defaultOptions
      );

      expect(result.status).toBe('downloaded');
      // File should be in the download directory, not escaped
      expect(existsSync(join(TEST_DIR, '_.._.._etc_passwd'))).toBe(true);
    });
  });

  describe('downloadSequential', () => {
    it('downloads files in sequence', async () => {
      const files = [
        { url: 'https://example.com/a.zip', filename: 'a.zip' },
        { url: 'https://example.com/b.zip', filename: 'b.zip' },
      ];

      mockFetchStream
        .mockResolvedValueOnce({
          body: createMockStream('content a'),
          contentLength: 9,
          status: 200,
        })
        .mockResolvedValueOnce({
          body: createMockStream('content b'),
          contentLength: 9,
          status: 200,
        });

      const results = await downloadSequential(files, defaultOptions);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('downloaded');
      expect(results[1]?.status).toBe('downloaded');
    });

    it('calls onFileComplete callback', async () => {
      const files = [{ url: 'https://example.com/a.zip', filename: 'a.zip' }];

      mockFetchStream.mockResolvedValue({
        body: createMockStream('content'),
        contentLength: 7,
        status: 200,
      });

      const onComplete = vi.fn();

      await downloadSequential(files, defaultOptions, undefined, onComplete);

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'downloaded' }),
        0,
        1
      );
    });

    it('continues after failed download', async () => {
      const files = [
        { url: 'https://example.com/fail.zip', filename: 'fail.zip' },
        { url: 'https://example.com/success.zip', filename: 'success.zip' },
      ];

      mockFetchStream.mockRejectedValueOnce(new Error('Failed')).mockResolvedValueOnce({
        body: createMockStream('content'),
        contentLength: 7,
        status: 200,
      });

      const results = await downloadSequential(files, defaultOptions);

      expect(results).toHaveLength(2);
      expect(results[0]?.status).toBe('failed');
      expect(results[1]?.status).toBe('downloaded');
    });
  });

  describe('downloadConcurrent', () => {
    it('downloads files concurrently', async () => {
      const files = [
        { url: 'https://example.com/a.zip', filename: 'a.zip' },
        { url: 'https://example.com/b.zip', filename: 'b.zip' },
        { url: 'https://example.com/c.zip', filename: 'c.zip' },
      ];

      mockFetchStream.mockImplementation(() =>
        Promise.resolve({
          body: createMockStream('content'),
          contentLength: 7,
          status: 200,
        })
      );

      const results = await downloadConcurrent(files, defaultOptions, 2);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === 'downloaded')).toBe(true);
    });

    it('calls onFileComplete for each file', async () => {
      const files = [
        { url: 'https://example.com/a.zip', filename: 'a.zip' },
        { url: 'https://example.com/b.zip', filename: 'b.zip' },
      ];

      mockFetchStream.mockImplementation(() =>
        Promise.resolve({
          body: createMockStream('content'),
          contentLength: 7,
          status: 200,
        })
      );

      const onComplete = vi.fn();

      await downloadConcurrent(files, defaultOptions, 2, onComplete);

      expect(onComplete).toHaveBeenCalledTimes(2);
    });

    it('handles empty file list', async () => {
      const results = await downloadConcurrent([], defaultOptions, 2);

      expect(results).toHaveLength(0);
    });
  });
});
