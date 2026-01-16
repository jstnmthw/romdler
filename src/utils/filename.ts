import { resolve, basename } from 'node:path';

/**
 * Sanitizes a filename to prevent path traversal and other security issues.
 * - Removes path separators
 * - Removes null bytes
 * - Removes leading dots (hidden files, parent directory)
 * - Decodes URL encoding
 * - Limits length
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename;

  // Decode URL encoding (handle double encoding)
  try {
    safe = decodeURIComponent(safe);
  } catch {
    // If decoding fails, use as-is
  }

  // Remove path separators
  safe = safe.replace(/[/\\]/g, '_');

  // Remove null bytes
  safe = safe.replace(/\0/g, '');

  // Remove leading dots (prevents hidden files and parent directory)
  safe = safe.replace(/^\.+/, '');

  // Remove control characters
  safe = safe.replace(/[\x00-\x1f\x7f]/g, '');

  // Replace problematic characters on Windows
  safe = safe.replace(/[<>:"|?*]/g, '_');

  // Trim whitespace
  safe = safe.trim();

  // Ensure not empty
  if (safe === '') {
    safe = 'unnamed';
  }

  // Limit length (255 is common filesystem limit)
  const MAX_LENGTH = 200;
  if (safe.length > MAX_LENGTH) {
    const ext = safe.lastIndexOf('.');
    if (ext > 0 && safe.length - ext <= 10) {
      // Preserve extension
      const extension = safe.slice(ext);
      safe = safe.slice(0, MAX_LENGTH - extension.length) + extension;
    } else {
      safe = safe.slice(0, MAX_LENGTH);
    }
  }

  return safe;
}

/**
 * Creates a safe absolute path within the base directory.
 * Throws if the resulting path would escape the base directory.
 */
export function safePath(baseDir: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const resolvedBase = resolve(baseDir);
  const fullPath = resolve(resolvedBase, sanitized);

  // Verify the path is still within the base directory
  if (!fullPath.startsWith(resolvedBase)) {
    throw new Error(`Path traversal detected: ${filename}`);
  }

  return fullPath;
}

/**
 * Generates a temporary filename for atomic writes.
 */
export function tempFilename(filename: string): string {
  const base = basename(filename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `.${base}.${timestamp}.${random}.tmp`;
}
