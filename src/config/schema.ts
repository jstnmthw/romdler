import { z } from 'zod';

/** ScreenScraper credentials schema */
const scraperCredentialsSchema = z.object({
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

/** Adapter source configuration schema */
const adapterSourceSchema = z.object({
  id: z.enum(['libretro', 'screenscraper']),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(1),
});

/** Scraper configuration schema */
const scraperSchema = z.object({
  enabled: z.boolean().default(false),
  /** @deprecated Use sources array instead */
  source: z.enum(['screenscraper', 'libretro']).optional(),
  /** Adapter sources with priority (lower priority = tried first) */
  sources: z.array(adapterSourceSchema).optional(),
  credentials: scraperCredentialsSchema.optional(),
  systemId: z.number().int().min(1).optional(),
  mediaType: z.string().default('box-2D'),
  regionPriority: z.array(z.string()).default(['us', 'wor', 'eu', 'jp']),
  resize: resizeSchema.default({ enabled: false, maxWidth: 300, maxHeight: 300 }),
  skipExisting: z.boolean().default(true),
  rateLimitMs: z.number().int().min(100).max(10000).default(1000),
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
});

export type Config = z.infer<typeof configSchema>;
export type ScraperCredentials = z.infer<typeof scraperCredentialsSchema>;
export type ScraperConfigSchema = z.infer<typeof scraperSchema>;
export type AdapterSourceConfigSchema = z.infer<typeof adapterSourceSchema>;
