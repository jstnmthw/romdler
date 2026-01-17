import { writeFile, mkdir, rename, unlink } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

/** Options for downloading an image */
export interface DownloadImageOptions {
  /** URL to download from */
  url: string;
  /** Output directory */
  outputDir: string;
  /** Output filename (without extension) */
  filename: string;
  /** User agent for the request */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/** Result of an image download */
export interface DownloadImageResult {
  success: boolean;
  /** Path to the downloaded image */
  path?: string;
  /** Error message if failed */
  error?: string;
  /** Downloaded file size in bytes */
  size?: number;
}

/**
 * Download an image from a URL and save it to disk
 * Uses atomic write pattern (temp file -> rename) to prevent partial files
 */
export async function downloadImage(
  options: DownloadImageOptions
): Promise<DownloadImageResult> {
  const {
    url,
    outputDir,
    filename,
    userAgent,
    timeoutMs = 30000,
  } = options;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Generate temp filename
  const tempSuffix = randomBytes(4).toString('hex');
  const tempFilename = `.${filename}.${Date.now()}.${tempSuffix}.tmp`;
  const tempPath = path.join(outputDir, tempFilename);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') ?? '';
    const extension = getExtensionFromContentType(contentType);

    if (extension === null) {
      return {
        success: false,
        error: `Unsupported content type: ${contentType}`,
      };
    }

    // Download to buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    // Write to temp file
    await writeFile(tempPath, buffer);

    // Determine final path
    const finalPath = path.join(outputDir, `${filename}${extension}`);

    // Atomic rename
    await rename(tempPath, finalPath);

    return {
      success: true,
      path: finalPath,
      size: buffer.length,
    };
  } catch (err) {
    // Clean up temp file if it exists
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    const error = err as Error;

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeoutMs}ms`,
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get file extension from content-type header
 */
function getExtensionFromContentType(contentType: string): string | null {
  const type = (contentType.split(';')[0] ?? '').trim().toLowerCase();

  const extensionMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
  };

  return extensionMap[type] ?? null;
}

/**
 * Validate that a URL is a valid HTTP/HTTPS URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
