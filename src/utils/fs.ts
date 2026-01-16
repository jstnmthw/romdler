import { mkdir, stat, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a file exists.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Gets the size of a file in bytes, or null if it doesn't exist.
 */
export async function getFileSize(filePath: string): Promise<number | null> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

/**
 * Atomically moves a file from source to destination.
 * Creates the destination directory if it doesn't exist.
 */
export async function atomicMove(
  sourcePath: string,
  destPath: string
): Promise<void> {
  await ensureDir(dirname(destPath));
  await rename(sourcePath, destPath);
}

/**
 * Safely deletes a file if it exists.
 */
export async function safeDelete(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== 'ENOENT') {
      throw err;
    }
  }
}
