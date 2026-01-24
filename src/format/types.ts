/** Gravity position for compositing image on canvas */
export type Gravity = 'east' | 'west' | 'center' | 'north' | 'south';

/** Format settings (from config or defaults) */
export type FormatSettings = {
  /** Canvas width in pixels */
  canvasWidth: number;
  /** Canvas height in pixels */
  canvasHeight: number;
  /** Maximum width for resized artwork */
  resizeMaxWidth: number;
  /** Maximum height for resized artwork */
  resizeMaxHeight: number;
  /** Gravity position for artwork placement */
  gravity: Gravity;
  /** Padding from edge in pixels */
  padding: number;
  /** Output subfolder name within Imgs directory */
  outputFolder: string;
};

/** Image file discovered during scanning */
export type ImageFile = {
  /** Absolute path to the image file */
  path: string;
  /** Filename with extension */
  filename: string;
  /** Filename without extension (stem) */
  stem: string;
  /** File extension including dot */
  extension: string;
};

/** Result of processing a single image */
export type FormatResult = {
  /** Source image information */
  image: ImageFile;
  /** Processing status */
  status: 'formatted' | 'skipped' | 'failed';
  /** Output path (if successful) */
  outputPath?: string;
  /** Error message (if failed) */
  error?: string;
};

/** Summary statistics for a format operation */
export type FormatSummary = {
  /** Total images found */
  totalImages: number;
  /** Number successfully formatted */
  formatted: number;
  /** Number skipped (already exists) */
  skipped: number;
  /** Number that failed */
  failed: number;
  /** Total time in milliseconds */
  elapsedMs: number;
};

/** Options passed to the format command */
export type FormatOptions = {
  /** Preview mode - don't actually process */
  dryRun: boolean;
  /** Overwrite existing formatted images */
  force: boolean;
  /** Format settings */
  settings: FormatSettings;
  /** Limit number of images to process */
  limit?: number;
};
