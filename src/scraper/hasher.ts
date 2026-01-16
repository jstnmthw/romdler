import { createReadStream } from 'fs';
import { crc32 } from 'zlib';

const CHUNK_SIZE = 65536; // 64KB chunks for memory efficiency

/**
 * Calculate CRC32 hash of a file using streaming
 * @param filePath - Absolute path to the file
 * @returns CRC32 hash as 8-character uppercase hex string
 */
export async function calculateCRC32(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let crcValue = 0;

    const stream = createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

    stream.on('data', (chunk: Buffer) => {
      // zlib.crc32 returns a signed 32-bit integer
      // We need to accumulate across chunks
      crcValue = crc32(chunk, crcValue);
    });

    stream.on('end', () => {
      // Convert to unsigned and format as 8-char hex
      const unsignedCrc = crcValue >>> 0;
      resolve(unsignedCrc.toString(16).toUpperCase().padStart(8, '0'));
    });

    stream.on('error', (err) => {
      reject(new Error(`Failed to calculate CRC32 for ${filePath}: ${err.message}`));
    });
  });
}

/**
 * Calculate CRC32 hash for multiple files
 * @param filePaths - Array of absolute file paths
 * @param onProgress - Optional callback for progress updates
 * @returns Map of file path to CRC32 hash
 */
export async function calculateCRC32Batch(
  filePaths: string[],
  onProgress?: (completed: number, total: number, currentFile: string) => void
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i]!;
    onProgress?.(i, filePaths.length, filePath);

    try {
      const crc = await calculateCRC32(filePath);
      results.set(filePath, crc);
    } catch {
      // Store empty string for failed hashes
      results.set(filePath, '');
    }
  }

  onProgress?.(filePaths.length, filePaths.length, '');
  return results;
}
