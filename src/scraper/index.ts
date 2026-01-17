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
  LibretroConfig,
  ScreenScraperConfig,
  ResizeConfig,
  MediaType,
  RegionCode,
} from './types.js';

// Scanner utilities
export {
  scanForRoms,
  getImgsDirectory,
  findExistingImage,
  filterRomsWithExistingImages,
} from './scanner.js';

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

// Adapter system
export { adapterRegistry, AdapterRegistry } from './adapters/index.js';
export type {
  ArtworkAdapter,
  AdapterCapabilities,
  AdapterSourceConfig,
  ArtworkLookupResult,
  LookupParams,
} from './adapters/index.js';

// Libretro adapter
export { LibretroAdapter, createLibretroAdapter } from './libretro/index.js';
export type { LibretroAdapterOptions } from './libretro/index.js';

// ScreenScraper client and utilities
export * from './screenscraper/index.js';
