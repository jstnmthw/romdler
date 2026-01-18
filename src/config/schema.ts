import { z } from 'zod';
import { join } from 'node:path';
import { getSystemInfo, SYSTEM_REGISTRY, type SystemInfo } from '../systems/index.js';

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

/** Custom system definition schema (for user-defined systems) */
const customSystemSchema = z.object({
  name: z.string().min(1),
  systemId: z.number().int().min(1),
  extensions: z.array(z.string()).optional(),
});

/** Per-system settings that can be defined in defaults and overridden per-system */
const systemDefaultsSchema = z.object({
  tableId: z.string().min(1).default('list'),
  whitelist: z.array(z.string()).default([]),
  blacklist: z.array(z.string()).default([]),
  dedupe: dedupePreferencesSchema.optional(),
});

/** Individual system configuration */
const systemConfigSchema = z.object({
  /** System shortcode (e.g., 'gbc', 'snes', 'psx') */
  system: z.string().min(1, 'System shortcode is required'),
  /** URL to the ROM directory listing */
  url: z.string().url('System URL must be a valid URL'),
  /** Folder name within downloadDir (defaults to system shortcode) */
  folder: z.string().min(1).optional(),
  /** Optional overrides for default settings */
  tableId: z.string().min(1).optional(),
  whitelist: z.array(z.string()).optional(),
  blacklist: z.array(z.string()).optional(),
  dedupe: dedupePreferencesSchema.optional(),
});

/** Artwork scraper configuration schema */
const scraperSchema = z.object({
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
  screenscraper: screenscraperConfigSchema.default({
    enabled: false,
    priority: 2,
    rateLimitMs: 1000,
  }),
});

export const configSchema = z.object({
  /** Parent directory for all system folders */
  downloadDir: z.string().min(1, 'Download directory is required'),
  /** Default settings for all systems (can be overridden per-system) */
  defaults: systemDefaultsSchema.default({
    tableId: 'list',
    whitelist: [],
    blacklist: [],
  }),
  /** Custom system definitions (override or extend built-in registry) */
  customSystems: z.record(z.string(), customSystemSchema).optional(),
  /** Array of system configurations */
  systems: z.array(systemConfigSchema).min(1, 'At least one system is required'),
  /** Number of concurrent downloads */
  concurrency: z.number().int().min(1).max(10).default(1),
  /** User agent for HTTP requests */
  userAgent: z.string().default('Wget/1.21.2'),
  /** Request timeout in milliseconds */
  requestTimeoutMs: z.number().int().min(1000).max(300000).default(30000),
  /** Number of retries for failed requests */
  retries: z.number().int().min(0).max(10).default(2),
  /** Log level */
  logLevel: z.enum(['debug', 'info', 'silent']).default('info'),
  /** Artwork scraper configuration */
  scraper: scraperSchema.optional(),
});

export type Config = z.infer<typeof configSchema>;
export type SystemConfig = z.infer<typeof systemConfigSchema>;
export type SystemDefaults = z.infer<typeof systemDefaultsSchema>;
export type CustomSystemDef = z.infer<typeof customSystemSchema>;
export type DedupePreferences = z.infer<typeof dedupePreferencesSchema>;
export type ScraperConfigSchema = z.infer<typeof scraperSchema>;
export type LibretroConfigSchema = z.infer<typeof libretroConfigSchema>;
export type ScreenScraperConfigSchema = z.infer<typeof screenscraperConfigSchema>;
export type ScreenScraperCredentials = z.infer<typeof screenscraperCredentialsSchema>;
export type ResizeConfigSchema = z.infer<typeof resizeSchema>;

/** A system config with all defaults resolved */
export type ResolvedSystemConfig = {
  /** Human-readable system name (from registry) */
  name: string;
  /** URL to the ROM directory listing */
  url: string;
  /** Full path to download directory (parent + folder) */
  downloadDir: string;
  /** System ID for artwork scraping (from registry) */
  systemId: number;
  /** HTML table ID */
  tableId: string;
  /** Whitelist patterns */
  whitelist: string[];
  /** Blacklist patterns */
  blacklist: string[];
  /** Dedupe preferences */
  dedupe?: DedupePreferences;
};

/**
 * Look up system info from registry or custom systems
 */
function lookupSystemInfo(
  shortcode: string,
  customSystems?: Record<string, CustomSystemDef>
): SystemInfo {
  // Check custom systems first (allows overrides)
  if (customSystems !== undefined && shortcode in customSystems) {
    const custom = customSystems[shortcode]!;
    return {
      name: custom.name,
      systemId: custom.systemId,
      extensions: custom.extensions ?? ['.zip'],
    };
  }

  // Fall back to built-in registry
  const builtin = getSystemInfo(shortcode);
  if (builtin !== undefined) {
    return builtin;
  }

  throw new Error(
    `Unknown system shortcode: '${shortcode}'. ` +
      `Valid shortcodes: ${Object.keys(SYSTEM_REGISTRY).join(', ')}. ` +
      `Or define it in customSystems.`
  );
}

/**
 * Resolve a system configuration by merging with defaults and looking up system info
 * @param system - The system configuration
 * @param config - The full config (for downloadDir and customSystems)
 * @returns Resolved system config with all defaults applied
 */
export function resolveSystemConfig(system: SystemConfig, config: Config): ResolvedSystemConfig {
  const systemInfo = lookupSystemInfo(system.system, config.customSystems);

  // Use folder if provided, otherwise default to system shortcode
  const folder = system.folder ?? system.system;

  return {
    name: systemInfo.name,
    url: system.url,
    downloadDir: join(config.downloadDir, folder),
    systemId: systemInfo.systemId,
    tableId: system.tableId ?? config.defaults.tableId,
    whitelist: system.whitelist ?? config.defaults.whitelist,
    blacklist: system.blacklist ?? config.defaults.blacklist,
    dedupe: system.dedupe ?? config.defaults.dedupe,
  };
}

// Re-export for convenience
export { SYSTEM_REGISTRY, getSystemInfo };
