import type {
  ArtworkAdapter,
  AdapterCapabilities,
  LookupParams,
  ArtworkLookupResult,
} from '../adapters/types.js';
import { getLibretroSystemName, SUPPORTED_SYSTEM_IDS } from './systems.js';
import { sanitizeFilename } from './sanitizer.js';
import { LibretroManifest } from './manifest.js';

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
 *
 * Uses a manifest-based approach for fast matching:
 * 1. Fetches file listing from GitHub API once per system
 * 2. Matches locally against the manifest (no network calls per ROM)
 * 3. Only makes network request for actual download
 *
 * Matching priority:
 * 1. Exact match
 * 2. Variant-stripped match (remove Proto, Beta, etc. but keep region)
 * 3. Title-only match (find best match by base title)
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
  private manifest: LibretroManifest;

  constructor(options: LibretroAdapterOptions = {}) {
    this.userAgent = options.userAgent ?? 'romdler/1.0';
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.manifest = new LibretroManifest({
      userAgent: this.userAgent,
      timeoutMs: this.timeoutMs,
    });
  }

  initialize(): Promise<boolean> {
    this.initialized = true;
    return Promise.resolve(true);
  }

  /**
   * Prefetch manifest for a system. Throws on errors.
   * Call this before processing ROMs to fail fast on API errors.
   */
  async prefetch(systemId: number): Promise<void> {
    await this.manifest.prefetch(systemId);
  }

  supportsSystem(systemId: number): boolean {
    return getLibretroSystemName(systemId) !== undefined;
  }

  getRateLimitDelay(): number {
    // With manifest-based matching, we only hit CDN for actual downloads
    // Use minimal delay since lookups are local
    return 50;
  }

  async lookup(params: LookupParams): Promise<ArtworkLookupResult | null> {
    if (!this.initialized) {
      return null;
    }

    // Get manifest for this system/media type
    const manifestData = await this.manifest.getManifest(
      params.systemId,
      params.mediaType
    );

    if (manifestData === null) {
      return { found: false };
    }

    // Sanitize the filename for matching
    const sanitizedStem = sanitizeFilename(params.rom.stem);

    // Find match in manifest (handles exact, variant-stripped, and title-only matching)
    const matchResult = this.manifest.findMatch(manifestData, sanitizedStem);

    if (matchResult === null) {
      return { found: false };
    }

    // Build the download URL
    const mediaUrl = this.manifest.buildUrl(
      params.systemId,
      params.mediaType,
      matchResult.match
    );

    if (mediaUrl === null) {
      return { found: false };
    }

    return {
      found: true,
      gameName: matchResult.match,
      mediaUrl,
      bestEffort: matchResult.bestEffort,
      originalName: matchResult.bestEffort ? params.rom.stem : undefined,
    };
  }

  dispose(): Promise<void> {
    this.initialized = false;
    this.manifest.clearCache();
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
