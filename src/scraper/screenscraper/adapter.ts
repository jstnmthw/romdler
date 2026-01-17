import type {
  ArtworkAdapter,
  AdapterCapabilities,
  LookupParams,
  ArtworkLookupResult,
} from '../adapters/types.js';
import type { ScreenScraperCredentials } from '../types.js';
import { ScreenScraperClient, selectMediaUrl } from './client.js';
import { getSystemById } from './systems.js';

/** Media types available from ScreenScraper */
const SCREENSCRAPER_MEDIA_TYPES = [
  'box-2D',
  'box-3D',
  'ss',
  'sstitle',
  'mixrbv1',
  'mixrbv2',
  'wheel',
  'marquee',
  'fanart',
  'video',
] as const;

/** Options for ScreenScraper adapter */
export type ScreenScraperAdapterOptions = {
  credentials: ScreenScraperCredentials;
  rateLimitMs?: number;
  userAgent?: string;
};

/**
 * ScreenScraper artwork adapter.
 * Uses hash-based ROM identification for accurate matching.
 */
export class ScreenScraperAdapter implements ArtworkAdapter {
  readonly id = 'screenscraper';
  readonly name = 'ScreenScraper.fr';

  readonly capabilities: AdapterCapabilities = {
    hashLookup: true,
    filenameLookup: true,
    mediaTypes: [...SCREENSCRAPER_MEDIA_TYPES],
    platforms: 'all',
  };

  private client: ScreenScraperClient | null = null;
  private credentials: ScreenScraperCredentials;
  private rateLimitMs: number;
  private userAgent: string;
  private initialized = false;

  constructor(options: ScreenScraperAdapterOptions) {
    this.credentials = options.credentials;
    this.rateLimitMs = options.rateLimitMs ?? 1000;
    this.userAgent = options.userAgent ?? 'Wget/1.21.2';
  }

  initialize(): Promise<boolean> {
    // Validate credentials are present
    if (
      this.credentials.devId === '' ||
      this.credentials.devPassword === '' ||
      this.credentials.userId === '' ||
      this.credentials.userPassword === ''
    ) {
      return Promise.resolve(false);
    }

    this.client = new ScreenScraperClient(this.credentials, this.rateLimitMs, this.userAgent);

    this.initialized = true;
    return Promise.resolve(true);
  }

  supportsSystem(systemId: number): boolean {
    // ScreenScraper supports the system if we have a mapping for it
    return getSystemById(systemId) !== undefined;
  }

  getRateLimitDelay(): number {
    return this.rateLimitMs;
  }

  async lookup(params: LookupParams): Promise<ArtworkLookupResult | null> {
    if (!this.initialized || this.client === null) {
      return null;
    }

    // ScreenScraper requires CRC hash for accurate lookup
    if (params.crc === undefined || params.crc === '') {
      return null;
    }

    try {
      const gameResult = await this.client.lookupGame({
        crc: params.crc,
        systemId: params.systemId,
        romName: params.rom.filename,
        romSize: params.rom.size,
      });

      if (gameResult === null) {
        return { found: false };
      }

      // Select media URL based on preferences
      const mediaUrl = selectMediaUrl(gameResult.medias, params.mediaType, params.regionPriority);

      if (mediaUrl === null) {
        return {
          found: true,
          gameId: gameResult.gameId,
          gameName: gameResult.gameName,
          metadata: { medias: gameResult.medias },
        };
      }

      return {
        found: true,
        gameId: gameResult.gameId,
        gameName: gameResult.gameName,
        mediaUrl,
        metadata: { medias: gameResult.medias },
      };
    } catch {
      return null;
    }
  }

  dispose(): Promise<void> {
    this.client = null;
    this.initialized = false;
    return Promise.resolve();
  }
}

/**
 * Factory function to create ScreenScraper adapter
 */
export function createScreenScraperAdapter(options?: Record<string, unknown>): ArtworkAdapter {
  if (options === undefined) {
    throw new Error('ScreenScraper adapter requires credentials options');
  }

  const credentials = options['credentials'] as ScreenScraperCredentials | undefined;

  if (credentials === undefined) {
    throw new Error('ScreenScraper adapter requires credentials');
  }

  return new ScreenScraperAdapter({
    credentials,
    rateLimitMs: (options['rateLimitMs'] as number) ?? 1000,
    userAgent: (options['userAgent'] as string) ?? 'Wget/1.21.2',
  });
}
