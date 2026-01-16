import { z } from 'zod';

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
});

export type Config = z.infer<typeof configSchema>;
