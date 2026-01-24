import path from 'path';
import sharp from 'sharp';
import type { FormatSettings, ImageFile, FormatResult, Gravity } from './types.js';
import { findExistingFormatted } from './scanner.js';

/**
 * Calculate the position (left, top) for compositing based on gravity and padding
 * @param canvasWidth - Width of the target canvas
 * @param canvasHeight - Height of the target canvas
 * @param imageWidth - Width of the image to composite
 * @param imageHeight - Height of the image to composite
 * @param gravity - Alignment direction
 * @param padding - Padding from edge in pixels
 * @returns Position coordinates for compositing
 */
export function calculatePosition(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number,
  gravity: Gravity,
  padding: number
): { left: number; top: number } {
  // Calculate centered position
  const centerX = Math.round((canvasWidth - imageWidth) / 2);
  const centerY = Math.round((canvasHeight - imageHeight) / 2);

  switch (gravity) {
    case 'west':
      return { left: padding, top: centerY };
    case 'east':
      return { left: canvasWidth - imageWidth - padding, top: centerY };
    case 'north':
      return { left: centerX, top: padding };
    case 'south':
      return { left: centerX, top: canvasHeight - imageHeight - padding };
    case 'center':
    default:
      return { left: centerX, top: centerY };
  }
}

/**
 * Process a single image for formatting
 * @param image - Source image file
 * @param settings - Format settings
 * @param outputDir - Output directory for formatted images
 * @param force - Overwrite existing files
 * @returns Format result
 */
export async function processImage(
  image: ImageFile,
  settings: FormatSettings,
  outputDir: string,
  force: boolean
): Promise<FormatResult> {
  // Output always uses .png for transparency support
  const outputFilename = `${image.stem}.png`;
  const outputPath = path.join(outputDir, outputFilename);

  // Check if already exists (unless force)
  if (!force) {
    const existing = await findExistingFormatted(image.stem, outputDir);
    if (existing !== null) {
      return {
        image,
        status: 'skipped',
        outputPath: existing,
      };
    }
  }

  try {
    // Read source image and get metadata
    const source = sharp(image.path);
    const metadata = await source.metadata();

    if (metadata.width === undefined || metadata.height === undefined) {
      return {
        image,
        status: 'failed',
        error: 'Could not read image dimensions',
      };
    }

    // Resize to fit within max dimensions while preserving aspect ratio
    const resized = source.resize({
      width: settings.resizeMaxWidth,
      height: settings.resizeMaxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Get resized dimensions for compositing
    const resizedBuffer = await resized.toBuffer();
    const resizedMeta = await sharp(resizedBuffer).metadata();

    if (resizedMeta.width === undefined || resizedMeta.height === undefined) {
      return {
        image,
        status: 'failed',
        error: 'Could not determine resized dimensions',
      };
    }

    // Calculate position based on gravity and padding
    const position = calculatePosition(
      settings.canvasWidth,
      settings.canvasHeight,
      resizedMeta.width,
      resizedMeta.height,
      settings.gravity,
      settings.padding
    );

    // Create transparent canvas and composite resized image
    await sharp({
      create: {
        width: settings.canvasWidth,
        height: settings.canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: resizedBuffer,
          left: position.left,
          top: position.top,
        },
      ])
      .png()
      .toFile(outputPath);

    return {
      image,
      status: 'formatted',
      outputPath,
    };
  } catch (err) {
    const error = err as Error;
    return {
      image,
      status: 'failed',
      error: error.message,
    };
  }
}
