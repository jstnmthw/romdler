// Main scraper entry point
export { runScraper } from './scraper.js';

// Types
export type {
  RomFile,
  ScrapeResult,
  ScrapeSummary,
  ScreenScraperCredentials,
  ScraperConfig,
  ScrapeOptions,
  MediaType,
  RegionCode,
} from './types.js';

// Scanner utilities
export { scanForRoms, getImgsDirectory, findExistingImage, filterRomsWithExistingImages } from './scanner.js';

// Hasher utility
export { calculateCRC32, calculateCRC32Batch } from './hasher.js';

// Image downloader
export { downloadImage, isValidImageUrl } from './downloader.js';
export type { DownloadImageOptions, DownloadImageResult } from './downloader.js';

// Reporter utilities
export {
  renderScrapeSummary,
  renderScrapeResult,
  renderDryRunHeader,
  renderDryRunList,
  calculateSummary,
} from './reporter.js';

// ScreenScraper client and utilities
export * from './screenscraper/index.js';
