// Main format entry point
export { runFormat } from './format.js';

// Scanner utilities
export {
  scanForImages,
  findExistingFormatted,
  ensureOutputDir,
  getOutputDirectory,
  getImgsDirectory,
} from './scanner.js';

// Image processor
export { processImage, calculatePosition } from './processor.js';

// Types
export type {
  FormatSettings,
  Gravity,
  ImageFile,
  FormatResult,
  FormatSummary,
  FormatOptions,
} from './types.js';
