/** ROM file discovered during scanning */
export interface RomFile {
  /** Absolute path to the ROM file */
  path: string;
  /** Filename with extension */
  filename: string;
  /** Filename without extension (stem) */
  stem: string;
  /** File extension including dot */
  extension: string;
  /** File size in bytes */
  size: number;
}

/** Result of scraping a single ROM */
export interface ScrapeResult {
  rom: RomFile;
  status: 'downloaded' | 'skipped' | 'not_found' | 'failed';
  /** Path to downloaded image (if successful) */
  imagePath?: string;
  /** CRC32 hash calculated for the ROM */
  crc?: string;
  /** Game name from source (if found) */
  gameName?: string;
  /** Source adapter that provided the artwork */
  source?: string;
  /** Error message (if failed) */
  error?: string;
  /** True if this was a fuzzy/best-effort match (not exact filename) */
  bestEffort?: boolean;
}

/** Summary statistics for a scrape operation */
export interface ScrapeSummary {
  totalRoms: number;
  downloaded: number;
  skipped: number;
  notFound: number;
  failed: number;
  /** Number of best-effort/fuzzy matches (subset of downloaded) */
  bestEffort: number;
  /** Total time in milliseconds */
  elapsedMs: number;
}

/** Credentials for ScreenScraper API */
export interface ScreenScraperCredentials {
  devId: string;
  devPassword: string;
  userId: string;
  userPassword: string;
}

/** Libretro adapter configuration */
export interface LibretroConfig {
  enabled: boolean;
  priority: number;
}

/** ScreenScraper adapter configuration */
export interface ScreenScraperConfig {
  enabled: boolean;
  priority: number;
  credentials?: ScreenScraperCredentials;
  rateLimitMs: number;
}

/** Image resize options */
export interface ResizeConfig {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
}

/** Configuration for the artwork scraper */
export interface ScraperConfig {
  enabled: boolean;
  /** System ID for platform identification */
  systemId: number;
  /** Media type to download (box-2D, ss, sstitle, etc.) */
  mediaType: string;
  /** Region priority for media selection */
  regionPriority: string[];
  /** Image resize options */
  resize: ResizeConfig;
  /** Skip files that already have images */
  skipExisting: boolean;
  /** Libretro adapter config */
  libretro: LibretroConfig;
  /** ScreenScraper adapter config */
  screenscraper: ScreenScraperConfig;
}

/** Options passed to the scrape command */
export interface ScrapeOptions {
  /** Preview mode - don't actually download */
  dryRun: boolean;
  /** Overwrite existing images */
  force: boolean;
  /** Override media type from config */
  mediaType?: string;
  /** Override region priority from config */
  regionPriority?: string[];
  /** Limit number of ROMs to process */
  limit?: number;
  /** Override source adapter (e.g., 'libretro', 'screenscraper') */
  source?: string;
}

/** Media types available */
export type MediaType =
  | 'ss' // Screenshot (in-game)
  | 'sstitle' // Title screen
  | 'box-2D' // 2D box art (front)
  | 'box-3D' // 3D box art render
  | 'mixrbv1' // Mix image v1
  | 'mixrbv2' // Mix image v2
  | 'wheel' // Logo/wheel art
  | 'marquee' // Arcade marquee
  | 'fanart' // Fan artwork
  | 'video'; // Video preview

/** Region codes */
export type RegionCode = 'wor' | 'us' | 'eu' | 'jp' | 'kr' | 'asi';
