import type {
  ArtworkAdapter,
  AdapterCapabilities,
  LookupParams,
  ArtworkLookupResult,
} from '../adapters/types.js';
import { getLibretroSystemName, SUPPORTED_SYSTEM_IDS } from './systems.js';
import { sanitizeFilename } from './sanitizer.js';

/** Base URL for Libretro thumbnail server */
const LIBRETRO_BASE_URL = 'https://thumbnails.libretro.com';

/** Libretro media types mapped to folder names */
const MEDIA_TYPE_FOLDERS: Record<string, string> = {
  'box-2D': 'Named_Boxarts',
  'boxart': 'Named_Boxarts',
  'ss': 'Named_Snaps',
  'snap': 'Named_Snaps',
  'screenshot': 'Named_Snaps',
  'sstitle': 'Named_Titles',
  'title': 'Named_Titles',
};

/** Media types available from Libretro */
const LIBRETRO_MEDIA_TYPES = ['box-2D', 'boxart', 'ss', 'snap', 'screenshot', 'sstitle', 'title'];

/** Options for Libretro adapter */
export type LibretroAdapterOptions = {
  /** User agent for HTTP requests */
  userAgent?: string;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
};

/**
 * Libretro Thumbnails artwork adapter.
 * Uses filename-based lookup against the libretro-thumbnails CDN.
 * No authentication required.
 */
export class LibretroAdapter implements ArtworkAdapter {
  readonly id = 'libretro';
  readonly name = 'Libretro Thumbnails';

  readonly capabilities: AdapterCapabilities = {
    hashLookup: false,
    filenameLookup: true,
    mediaTypes: LIBRETRO_MEDIA_TYPES,
    platforms: SUPPORTED_SYSTEM_IDS,
  };

  private userAgent: string;
  private timeoutMs: number;
  private initialized = false;

  constructor(options: LibretroAdapterOptions = {}) {
    this.userAgent = options.userAgent ?? 'Wget/1.21.2';
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  initialize(): Promise<boolean> {
    // No initialization needed for Libretro
    this.initialized = true;
    return Promise.resolve(true);
  }

  supportsSystem(systemId: number): boolean {
    return getLibretroSystemName(systemId) !== undefined;
  }

  getRateLimitDelay(): number {
    // Libretro CDN doesn't have strict rate limits, use minimal delay
    return 100;
  }

  async lookup(params: LookupParams): Promise<ArtworkLookupResult | null> {
    if (!this.initialized) {
      return null;
    }

    const systemName = getLibretroSystemName(params.systemId);
    if (systemName === undefined) {
      return { found: false };
    }

    // Build URL for the thumbnail
    const mediaUrl = this.buildThumbnailUrl(
      systemName,
      params.rom.stem,
      params.mediaType
    );

    if (mediaUrl === null) {
      return { found: false };
    }

    // Check if the thumbnail exists
    const exists = await this.checkUrlExists(mediaUrl);

    if (!exists) {
      return { found: false };
    }

    return {
      found: true,
      gameName: params.rom.stem,
      mediaUrl,
    };
  }

  /**
   * Build the thumbnail URL for a game
   */
  private buildThumbnailUrl(
    systemName: string,
    gameStem: string,
    mediaType: string
  ): string | null {
    const folder = MEDIA_TYPE_FOLDERS[mediaType];

    if (folder === undefined) {
      // Default to boxart
      return this.buildThumbnailUrl(systemName, gameStem, 'box-2D');
    }

    const sanitized = sanitizeFilename(gameStem);
    const encodedSystem = encodeURIComponent(systemName);
    const encodedName = encodeURIComponent(sanitized);

    return `${LIBRETRO_BASE_URL}/${encodedSystem}/${folder}/${encodedName}.png`;
  }

  /**
   * Check if a URL exists (HEAD request)
   */
  private async checkUrlExists(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  dispose(): Promise<void> {
    this.initialized = false;
    return Promise.resolve();
  }
}

/**
 * Factory function to create Libretro adapter
 */
export function createLibretroAdapter(
  options?: Record<string, unknown>
): ArtworkAdapter {
  return new LibretroAdapter({
    userAgent: (options?.['userAgent'] as string) ?? undefined,
    timeoutMs: (options?.['timeoutMs'] as number) ?? undefined,
  });
}
