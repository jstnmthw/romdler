import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, dirname } from 'node:path';

import { fetchStream, isHttpError } from '../http/index.js';
import {
  safePath,
  tempFilename,
  getFileSize,
  atomicMove,
  safeDelete,
  ensureDir,
} from '../utils/index.js';
import type {
  DownloadOptions,
  DownloadResult,
  ProgressCallback,
} from './types.js';

/**
 * Checks if a file already exists and should be skipped.
 */
async function checkExistingFile(
  url: string,
  destPath: string,
  options: DownloadOptions,
  filename: string
): Promise<DownloadResult | null> {
  const existingSize = await getFileSize(destPath);
  if (existingSize === null) {
    return null;
  }

  // File exists - check Content-Length if possible
  try {
    const { contentLength, body } = await fetchStream(url, {
      userAgent: options.userAgent,
      timeoutMs: options.timeoutMs,
      retries: 0,
    });

    // Cancel the body stream immediately - we only needed the headers
    await body.cancel();

    if (contentLength !== null && contentLength === existingSize) {
      return { filename, url, status: 'skipped', bytesDownloaded: 0 };
    }
  } catch {
    // If we can't check size, skip anyway since file exists
    return { filename, url, status: 'skipped', bytesDownloaded: 0 };
  }

  return null;
}

/**
 * Downloads a file to the specified directory using streaming.
 * Uses atomic write pattern: download to temp file, then rename on success.
 */
export async function downloadFile(
  url: string,
  filename: string,
  options: DownloadOptions,
  onProgress?: ProgressCallback
): Promise<DownloadResult> {
  const destPath = safePath(options.downloadDir, filename);
  const tempPath = join(dirname(destPath), tempFilename(filename));

  try {
    // Ensure download directory exists
    await ensureDir(options.downloadDir);

    // Check if file already exists
    const skipResult = await checkExistingFile(url, destPath, options, filename);
    if (skipResult !== null) {
      return skipResult;
    }

    // Start the download
    const { body, contentLength } = await fetchStream(url, {
      userAgent: options.userAgent,
      timeoutMs: options.timeoutMs,
      retries: options.retries,
    });

    // Create write stream
    const writeStream = createWriteStream(tempPath);

    // Track progress with throttling to reduce overhead
    let bytesDownloaded = 0;
    let lastProgressUpdate = 0;
    const PROGRESS_THROTTLE_MS = 100; // Update progress at most every 100ms

    // Create a transform stream to track progress
    const progressTracker = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller): void {
        bytesDownloaded += chunk.length;

        // Throttle progress updates to reduce overhead
        const now = Date.now();
        if (onProgress !== undefined && now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
          lastProgressUpdate = now;
          onProgress({
            filename,
            bytesDownloaded,
            totalBytes: contentLength,
            percentage:
              contentLength !== null
                ? Math.round((bytesDownloaded / contentLength) * 100)
                : null,
          });
        }

        controller.enqueue(chunk);
      },
    });

    // Pipe through progress tracker
    const trackedStream = body.pipeThrough(progressTracker);

    // Convert web stream to node stream and pipe to file
    const nodeStream = Readable.fromWeb(trackedStream);
    await pipeline(nodeStream, writeStream);

    // Atomic move: rename temp file to final destination
    await atomicMove(tempPath, destPath);

    return {
      filename,
      url,
      status: 'downloaded',
      bytesDownloaded,
    };
  } catch (err) {
    // Clean up temp file on failure
    await safeDelete(tempPath);

    const errorMessage = isHttpError(err)
      ? err.message
      : err instanceof Error
        ? err.message
        : 'Unknown error';

    return {
      filename,
      url,
      status: 'failed',
      bytesDownloaded: 0,
      error: errorMessage,
    };
  }
}

/**
 * Downloads multiple files sequentially.
 */
export async function downloadSequential(
  files: Array<{ url: string; filename: string }>,
  options: DownloadOptions,
  onProgress?: ProgressCallback,
  onFileComplete?: (result: DownloadResult, index: number, total: number) => void
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === undefined) {
      continue;
    }

    const result = await downloadFile(file.url, file.filename, options, onProgress);
    results.push(result);

    if (onFileComplete !== undefined) {
      onFileComplete(result, i, files.length);
    }
  }

  return results;
}

/**
 * Downloads multiple files with limited concurrency.
 */
export async function downloadConcurrent(
  files: Array<{ url: string; filename: string }>,
  options: DownloadOptions,
  concurrency: number,
  onFileComplete?: (result: DownloadResult, index: number, total: number) => void
): Promise<DownloadResult[]> {
  const results: (DownloadResult | undefined)[] = new Array<DownloadResult | undefined>(files.length);
  let nextIndex = 0;
  let completedCount = 0;

  async function worker(): Promise<void> {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex++;
      const file = files[currentIndex];
      if (file === undefined) {
        continue;
      }

      const result = await downloadFile(file.url, file.filename, options);
      results[currentIndex] = result;
      completedCount++;

      if (onFileComplete !== undefined) {
        onFileComplete(result, completedCount - 1, files.length);
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () =>
    worker()
  );

  await Promise.all(workers);

  // Filter out any undefined entries (shouldn't happen, but for type safety)
  return results.filter((r): r is DownloadResult => r !== undefined);
}
