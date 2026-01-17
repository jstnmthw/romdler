import type { RomFile } from '../types.js';

/** Capabilities a source adapter supports */
export type AdapterCapabilities = {
  /** Supports hash-based ROM identification */
  hashLookup: boolean;
  /** Supports filename-based lookup */
  filenameLookup: boolean;
  /** Media types available (source-specific identifiers) */
  mediaTypes: string[];
  /** Platform system IDs supported, or 'all' for universal support */
  platforms: number[] | 'all';
};

/** Result from an artwork lookup */
export type ArtworkLookupResult = {
  found: boolean;
  /** Game identifier from the source */
  gameId?: string;
  /** Game name from the source */
  gameName?: string;
  /** Direct URL to download the media */
  mediaUrl?: string;
  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
  /** True if this was a fuzzy/best-effort match (not exact) */
  bestEffort?: boolean;
  /** The original ROM name before transformation (for best-effort matches) */
  originalName?: string;
};

/** Parameters for artwork lookup */
export type LookupParams = {
  /** ROM file information */
  rom: RomFile;
  /** CRC32 hash (if calculated) */
  crc?: string;
  /** System/platform identifier */
  systemId: number;
  /** Preferred media type */
  mediaType: string;
  /** Region priority for media selection */
  regionPriority: string[];
};

/** Artwork source adapter interface */
export interface ArtworkAdapter {
  /** Unique identifier for this adapter */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Adapter capabilities */
  readonly capabilities: AdapterCapabilities;

  /**
   * Initialize the adapter (auth, token refresh, etc.)
   * Called once before any lookups.
   * @returns true if adapter is ready to use
   */
  initialize(): Promise<boolean>;

  /**
   * Look up artwork for a ROM
   * @param params Lookup parameters
   * @returns Lookup result with media URL, or null if not found
   */
  lookup(params: LookupParams): Promise<ArtworkLookupResult | null>;

  /**
   * Check if this adapter can handle the given system
   * @param systemId Platform/system ID
   */
  supportsSystem(systemId: number): boolean;

  /**
   * Get rate limit delay (ms) to wait between requests
   */
  getRateLimitDelay(): number;

  /**
   * Optional cleanup when adapter is no longer needed
   */
  dispose?(): Promise<void>;

  /**
   * Optional prefetch for adapters that use manifests.
   * Called before processing ROMs to fetch and cache data.
   * Throws on errors to enable fail-fast behavior.
   * @param systemId Platform/system ID
   */
  prefetch?(systemId: number): Promise<void>;
}

/** Configuration for a single adapter source */
export type AdapterSourceConfig = {
  /** Adapter identifier (e.g., 'libretro', 'screenscraper') */
  id: string;
  /** Whether this adapter is enabled */
  enabled: boolean;
  /** Priority (lower number = tried first) */
  priority: number;
  /** Adapter-specific options */
  options?: Record<string, unknown>;
};

/** Factory function to create adapter instances */
export type AdapterFactory = (
  options?: Record<string, unknown>
) => ArtworkAdapter;
