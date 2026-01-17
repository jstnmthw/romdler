import { readdir } from 'fs/promises';
import path from 'path';
import type { PurgeFileEntry } from './types.js';

/**
 * Scan download directory for files (excluding Imgs and hidden files)
 * @param directory - Directory to scan
 * @returns Array of file entries
 */
export async function scanDownloadDir(
  directory: string
): Promise<PurgeFileEntry[]> {
  const files: PurgeFileEntry[] = [];
  const absoluteDir = path.resolve(directory);

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and directories starting with special chars
      if (entry.name.startsWith('.') || entry.name.startsWith('-')) {
        continue;
      }
      // Skip Imgs directory
      if (entry.name.toLowerCase() === 'imgs') {
        continue;
      }
      // Only process files
      if (!entry.isFile()) {
        continue;
      }

      files.push({
        path: path.join(absoluteDir, entry.name),
        filename: entry.name,
      });
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Directory not found: ${directory}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${directory}`);
    }
    throw new Error(`Failed to scan directory: ${error.message}`);
  }

  // Sort by filename for consistent ordering
  files.sort((a, b) => a.filename.localeCompare(b.filename));

  return files;
}
