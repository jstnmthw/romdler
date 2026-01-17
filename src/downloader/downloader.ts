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
import type { DownloadOptions, DownloadResult, ProgressCallback } from './types.js';

/**
 * Checks if two file sizes match within a tolerance.
 * HTML displays rounded sizes (e.g., "155.7 KiB"), so exact match is unlikely.
 * We allow 1% tolerance to account for display rounding.
 */
function sizesMatch(size1: number, size2: number): boolean {
  if (size1 === size2) {
    return true;
  }
  const tolerance = Math.max(size1, size2) * 0.01; // 1% tolerance
  return Math.abs(size1 - size2) <= tolerance;
}

/**
 * Checks if a file already exists and should be skipped.
 * Uses expectedSize (from HTML manifest) when available to avoid HTTP requests.
 */
async function checkExistingFile(
  url: string,
  destPath: string,
  options: DownloadOptions,
  filename: string,
  expectedSize?: number
): Promise<DownloadResult | null> {
  const existingSize = await getFileSize(destPath);
  if (existingSize === null) {
    return null; // File doesn't exist locally
  }

  // If we have expected size from the HTML manifest, use it (no HTTP request needed!)
  // Use tolerance because HTML displays rounded sizes (e.g., "155.7 KiB")
  if (expectedSize !== undefined) {
    if (sizesMatch(existingSize, expectedSize)) {
      return { filename, url, status: 'skipped', bytesDownloaded: 0 };
    }
    // Size mismatch beyond tolerance - proceed to download
    return null;
  }

  // No expected size available - fall back to HTTP Content-Length check
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
 * @param expectedSize - Expected file size from HTML manifest (avoids HTTP size check if provided)
 */
export async function downloadFile(
  url: string,
  filename: string,
  options: DownloadOptions,
  onProgress?: ProgressCallback,
  expectedSize?: number
): Promise<DownloadResult> {
  const destPath = safePath(options.downloadDir, filename);
  const tempPath = join(dirname(destPath), tempFilename(filename));

  try {
    // Ensure download directory exists
    await ensureDir(options.downloadDir);

    // Check if file already exists (uses expectedSize to avoid HTTP request if available)
    const skipResult = await checkExistingFile(url, destPath, options, filename, expectedSize);
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
              contentLength !== null ? Math.round((bytesDownloaded / contentLength) * 100) : null,
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
  files: Array<{ url: string; filename: string; expectedSize?: number }>,
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

    const result = await downloadFile(
      file.url,
      file.filename,
      options,
      onProgress,
      file.expectedSize
    );
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
  files: Array<{ url: string; filename: string; expectedSize?: number }>,
  options: DownloadOptions,
  concurrency: number,
  onFileComplete?: (result: DownloadResult, index: number, total: number) => void
): Promise<DownloadResult[]> {
  const results: (DownloadResult | undefined)[] = new Array<DownloadResult | undefined>(
    files.length
  );
  let nextIndex = 0;
  let completedCount = 0;

  async function worker(): Promise<void> {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex++;
      const file = files[currentIndex];
      if (file === undefined) {
        continue;
      }

      const result = await downloadFile(
        file.url,
        file.filename,
        options,
        undefined,
        file.expectedSize
      );
      results[currentIndex] = result;
      completedCount++;

      if (onFileComplete !== undefined) {
        onFileComplete(result, completedCount - 1, files.length);
      }
    }
  }

  // Start workers
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());

  await Promise.all(workers);

  // Filter out any undefined entries (shouldn't happen, but for type safety)
  return results.filter((r): r is DownloadResult => r !== undefined);
}
