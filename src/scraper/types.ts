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
  /** Game name from ScreenScraper (if found) */
  gameName?: string;
  /** Error message (if failed) */
  error?: string;
}

/** Summary statistics for a scrape operation */
export interface ScrapeSummary {
  totalRoms: number;
  downloaded: number;
  skipped: number;
  notFound: number;
  failed: number;
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

/** Configuration for the scraper */
export interface ScraperConfig {
  enabled: boolean;
  source: 'screenscraper';
  credentials: ScreenScraperCredentials;
  /** ScreenScraper system ID */
  systemId: number;
  /** Media type to download (box-2D, ss, sstitle, etc.) */
  mediaType: string;
  /** Region priority for media selection */
  regionPriority: string[];
  /** Image resize options */
  resize: {
    enabled: boolean;
    maxWidth: number;
    maxHeight: number;
  };
  /** Skip ROMs that already have images */
  skipExisting: boolean;
  /** Delay between API requests in milliseconds */
  rateLimitMs: number;
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
}

/** Media types available from ScreenScraper */
export type MediaType =
  | 'ss'        // Screenshot (in-game)
  | 'sstitle'   // Title screen
  | 'box-2D'    // 2D box art (front)
  | 'box-3D'    // 3D box art render
  | 'mixrbv1'   // Mix image v1
  | 'mixrbv2'   // Mix image v2
  | 'wheel'     // Logo/wheel art
  | 'marquee'   // Arcade marquee
  | 'fanart'    // Fan artwork
  | 'video';    // Video preview

/** Region codes for ScreenScraper */
export type RegionCode = 'wor' | 'us' | 'eu' | 'jp' | 'kr' | 'asi';
