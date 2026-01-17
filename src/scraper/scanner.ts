import { readdir, stat } from 'fs/promises';
import path from 'path';
import type { RomFile } from './types.js';

/**
 * Scan a directory for ROM files with specified extensions
 * @param directory - Directory to scan
 * @param extensions - File extensions to include (e.g., ['.zip', '.sfc'])
 * @returns Array of discovered ROM files
 */
export async function scanForRoms(directory: string, extensions: string[]): Promise<RomFile[]> {
  const normalizedExts = extensions.map((ext) =>
    ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
  );

  const roms: RomFile[] = [];
  const absoluteDir = path.resolve(directory);

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and the Imgs directory
      if (entry.name.startsWith('.') || entry.name.startsWith('-')) {
        continue;
      }
      if (entry.name.toLowerCase() === 'imgs') {
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!normalizedExts.includes(ext)) {
        continue;
      }

      const fullPath = path.join(absoluteDir, entry.name);
      const fileStat = await stat(fullPath);
      roms.push({
        path: fullPath,
        filename: entry.name,
        stem: path.basename(entry.name, ext),
        extension: ext,
        size: fileStat.size,
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
  roms.sort((a, b) => a.filename.localeCompare(b.filename));

  return roms;
}

/**
 * Check if an image already exists for a ROM in the Imgs/ subdirectory
 * @param romStem - ROM filename without extension
 * @param imgsDir - Path to the Imgs directory
 * @returns Path to existing image or null
 */
export async function findExistingImage(romStem: string, imgsDir: string): Promise<string | null> {
  const imageExtensions = ['.png', '.jpg', '.jpeg'];

  for (const ext of imageExtensions) {
    const imagePath = path.join(imgsDir, `${romStem}${ext}`);
    try {
      await stat(imagePath);
      return imagePath;
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}

/**
 * Get the Imgs directory path for a ROM directory
 * @param romDirectory - Directory containing ROMs
 * @returns Path to Imgs subdirectory
 */
export function getImgsDirectory(romDirectory: string): string {
  return path.join(path.resolve(romDirectory), 'Imgs');
}

/**
 * Filter ROMs that already have images
 * @param roms - Array of ROM files
 * @param imgsDir - Path to Imgs directory
 * @returns Object with roms needing images and roms with existing images
 */
export async function filterRomsWithExistingImages(
  roms: RomFile[],
  imgsDir: string
): Promise<{ needsImage: RomFile[]; hasImage: RomFile[] }> {
  const needsImage: RomFile[] = [];
  const hasImage: RomFile[] = [];

  for (const rom of roms) {
    const existingImage = await findExistingImage(rom.stem, imgsDir);
    if (existingImage !== null) {
      hasImage.push(rom);
    } else {
      needsImage.push(rom);
    }
  }

  return { needsImage, hasImage };
}
