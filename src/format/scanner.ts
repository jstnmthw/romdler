import { readdir, stat, mkdir } from 'fs/promises';
import path from 'path';
import type { ImageFile } from './types.js';

/** Supported image extensions */
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'];

/**
 * Scan Imgs directory for image files (direct children only)
 * @param imgsDir - Path to the Imgs directory
 * @returns Array of discovered image files
 */
export async function scanForImages(imgsDir: string): Promise<ImageFile[]> {
  const absoluteDir = path.resolve(imgsDir);
  const images: ImageFile[] = [];

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and directories
      if (entry.name.startsWith('.')) {
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        continue;
      }

      const fullPath = path.join(absoluteDir, entry.name);
      images.push({
        path: fullPath,
        filename: entry.name,
        stem: path.basename(entry.name, ext),
        extension: ext,
      });
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Imgs directory not found: ${imgsDir}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${imgsDir}`);
    }
    throw new Error(`Failed to scan Imgs directory: ${error.message}`);
  }

  // Sort by filename for consistent ordering
  images.sort((a, b) => a.filename.localeCompare(b.filename));

  return images;
}

/**
 * Check if a formatted image already exists
 * @param imageStem - Image filename without extension
 * @param outputDir - Output directory to check
 * @returns Path to existing image or null
 */
export async function findExistingFormatted(
  imageStem: string,
  outputDir: string
): Promise<string | null> {
  for (const ext of IMAGE_EXTENSIONS) {
    const imagePath = path.join(outputDir, `${imageStem}${ext}`);
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
 * Ensure output directory exists
 * @param outputDir - Directory path to create
 */
export async function ensureOutputDir(outputDir: string): Promise<void> {
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code !== 'EEXIST') {
      throw new Error(`Failed to create output directory: ${error.message}`);
    }
  }
}

/**
 * Get the output directory path for formatted images
 * @param imgsDir - Base Imgs directory
 * @param outputFolder - Device-specific subfolder name
 * @returns Absolute path to output directory
 */
export function getOutputDirectory(imgsDir: string, outputFolder: string): string {
  return path.join(path.resolve(imgsDir), outputFolder);
}

/**
 * Get the Imgs directory path for a ROM directory
 * @param romDirectory - Directory containing ROMs
 * @returns Path to Imgs subdirectory
 */
export function getImgsDirectory(romDirectory: string): string {
  return path.join(path.resolve(romDirectory), 'Imgs');
}
