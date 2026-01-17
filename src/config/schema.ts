import { z } from 'zod';

/** ScreenScraper credentials schema */
const screenscraperCredentialsSchema = z.object({
  devId: z.string().min(1, 'Developer ID is required'),
  devPassword: z.string().min(1, 'Developer password is required'),
  userId: z.string().min(1, 'User ID is required'),
  userPassword: z.string().min(1, 'User password is required'),
});

/** Image resize options schema */
const resizeSchema = z.object({
  enabled: z.boolean().default(false),
  maxWidth: z.number().int().min(100).max(1000).default(300),
  maxHeight: z.number().int().min(100).max(1000).default(300),
});

/** Libretro adapter configuration */
const libretroConfigSchema = z.object({
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(1),
});

/** ScreenScraper adapter configuration */
const screenscraperConfigSchema = z.object({
  enabled: z.boolean().default(false),
  priority: z.number().int().min(1).max(100).default(2),
  credentials: screenscraperCredentialsSchema.optional(),
  rateLimitMs: z.number().int().min(100).max(10000).default(1000),
});

/** Dedupe preference configuration schema */
const dedupePreferencesSchema = z.object({
  /** Preferred regions in priority order (first = most preferred) */
  regions: z.array(z.string()).default(['USA', 'World', 'Europe', 'Japan']),
  /** Tokens to avoid - files containing these are less preferred */
  avoid: z.array(z.string()).default([
    // Development versions
    'Proto',
    'Beta',
    'Sample',
    'Demo',
    'Preview',
    'Promo',
    // Unofficial releases
    'Unl',
    'Pirate',
    'Aftermarket',
    // Re-release platforms
    'Virtual Console',
    'Retro-Bit',
    'Pixel Heart',
    'RetroZone',
    'Switch Online',
    'GameCube',
    'Wii U',
    '3DS',
    'NSO',
    'e-Reader',
    'iam8bit',
    'Limited Run',
    'Arcade Archives',
    'Mini Console',
    'Genesis Mini',
    'SNES Classic',
    'NES Classic',
    // Compilation releases
    'Capcom Classics',
    'Namco Museum',
    'Konami Collector',
    'Anniversary Collection',
    'Mega Man Legacy',
    'Disney Classic',
    // Revision/alternate
    'Rev',
    'Alt',
  ]),
  /** How to break ties when multiple candidates remain */
  tiebreaker: z.enum(['shortest', 'alphabetical']).default('shortest'),
});

/** Artwork scraper configuration schema */
const scraperSchema = z.object({
  /** System ID for platform identification */
  systemId: z.number().int().min(1).optional(),
  /** Media type to download (box-2D, ss, sstitle, etc.) */
  mediaType: z.string().default('box-2D'),
  /** Region preference order */
  regionPriority: z.array(z.string()).default(['us', 'wor', 'eu', 'jp']),
  /** Image resize options */
  resize: resizeSchema.default({ enabled: false, maxWidth: 300, maxHeight: 300 }),
  /** Skip files that already have images */
  skipExisting: z.boolean().default(true),

  /** Libretro Thumbnails adapter config (default, no auth required) */
  libretro: libretroConfigSchema.default({ enabled: true, priority: 1 }),
  /** ScreenScraper adapter config (requires credentials) */
  screenscraper: screenscraperConfigSchema.default({ enabled: false, priority: 2, rateLimitMs: 1000 }),
});

export const configSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL is required'),
  tableId: z.string().min(1, 'Table ID is required'),
  downloadDir: z.string().min(1, 'Download directory is required'),
  whitelist: z.array(z.string()).default([]),
  blacklist: z.array(z.string()).default([]),
  concurrency: z.number().int().min(1).max(10).default(1),
  userAgent: z.string().default('Wget/1.21.2'),
  requestTimeoutMs: z.number().int().min(1000).max(300000).default(30000),
  retries: z.number().int().min(0).max(10).default(2),
  logLevel: z.enum(['debug', 'info', 'silent']).default('info'),
  scraper: scraperSchema.optional(),
  dedupe: dedupePreferencesSchema.optional(),
});

export type Config = z.infer<typeof configSchema>;
export type DedupePreferences = z.infer<typeof dedupePreferencesSchema>;
export type ScraperConfigSchema = z.infer<typeof scraperSchema>;
export type LibretroConfigSchema = z.infer<typeof libretroConfigSchema>;
export type ScreenScraperConfigSchema = z.infer<typeof screenscraperConfigSchema>;
export type ScreenScraperCredentials = z.infer<typeof screenscraperCredentialsSchema>;
export type ResizeConfigSchema = z.infer<typeof resizeSchema>;
