/**
 * Libretro Thumbnails manifest fetching and caching.
 *
 * Fetches the list of available artwork files from the GitHub API once,
 * then uses local lookups for matching instead of per-file HTTP requests.
 */

import { getLibretroSystemName } from './systems.js';
import { parseCdnDirectory } from './cdn-parser.js';

/** GitHub Tree API base - returns all files in ONE request (no pagination) */
const GITHUB_TREE_API = 'https://api.github.com/repos/libretro-thumbnails';

/** CDN base for actual downloads */
const LIBRETRO_CDN_BASE = 'https://thumbnails.libretro.com';

/** Media type to folder name mapping */
const MEDIA_TYPE_FOLDERS: Record<string, string> = {
  'box-2D': 'Named_Boxarts',
  boxart: 'Named_Boxarts',
  ss: 'Named_Snaps',
  snap: 'Named_Snaps',
  screenshot: 'Named_Snaps',
  sstitle: 'Named_Titles',
  title: 'Named_Titles',
};

/** GitHub Tree API response */
type GitHubTreeResponse = {
  sha: string;
  url: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
};

/** GitHub Tree API file entry */
type GitHubTreeEntry = {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
};

/** Cached manifest for a single folder (media type) */
type FolderManifest = {
  /** Set of filenames (without .png extension, for fast lookup) */
  filenames: Set<string>;
  /** Map of lowercase filename to original filename (for case-insensitive matching) */
  lowercaseMap: Map<string, string>;
};

/** Cached manifest for an entire system (all folders) */
type SystemManifest = {
  /** Manifests per folder (Named_Boxarts, Named_Snaps, etc.) */
  folders: Map<string, FolderManifest>;
  /** Timestamp when cached */
  fetchedAt: number;
  /** Whether the fetch failed (cached to prevent retries) */
  failed?: boolean;
};

/** Result from GitHub API attempt */
type GitHubApiResult = {
  success: boolean;
  manifest: SystemManifest | null;
  rateLimited: boolean;
  error?: string;
};

/** Target folders to fetch from CDN */
const CDN_TARGET_FOLDERS = ['Named_Boxarts', 'Named_Snaps', 'Named_Titles'] as const;

/**
 * Manifest cache for Libretro thumbnails.
 * Fetches file listings once per system and caches them.
 * Uses GitHub Tree API for single-request fetching (no pagination needed).
 */
export class LibretroManifest {
  /** Cache by systemId - stores entire system manifest with all folders */
  private cache = new Map<number, SystemManifest>();
  private userAgent: string;
  private timeoutMs: number;

  constructor(options: { userAgent?: string; timeoutMs?: number } = {}) {
    this.userAgent = options.userAgent ?? 'romdler/1.0';
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  /**
   * Get or fetch the manifest for a system/media type.
   * @param systemId ScreenScraper system ID
   * @param mediaType Media type (box-2D, ss, etc.)
   * @returns Folder manifest for the requested media type, or null if not available
   */
  async getManifest(systemId: number, mediaType: string): Promise<FolderManifest | null> {
    const systemName = getLibretroSystemName(systemId);
    if (systemName === undefined) {
      return null;
    }

    const folder = MEDIA_TYPE_FOLDERS[mediaType] ?? 'Named_Boxarts';

    // Check cache first
    const cached = this.cache.get(systemId);
    if (cached !== undefined) {
      // Return null for failed fetches (but don't retry)
      if (cached.failed === true) {
        return null;
      }
      // Return the specific folder manifest
      return cached.folders.get(folder) ?? null;
    }

    // Fetch entire system from GitHub Tree API (single request)
    const systemManifest = await this.fetchSystemManifest(systemName);

    if (systemManifest !== null) {
      this.cache.set(systemId, systemManifest);
      return systemManifest.folders.get(folder) ?? null;
    }

    // Cache the failure to prevent repeated retries
    this.cache.set(systemId, {
      folders: new Map(),
      fetchedAt: Date.now(),
      failed: true,
    });

    return null;
  }

  /**
   * Fetch entire system manifest from GitHub Tree API with CDN fallback.
   * Returns all files across all folders in a single request.
   */
  private async fetchSystemManifest(systemName: string): Promise<SystemManifest | null> {
    // Try GitHub first
    const githubResult = await this.tryGitHubApi(systemName);
    if (githubResult.success) {
      return githubResult.manifest;
    }

    // If rate limited, try CDN fallback
    if (githubResult.rateLimited) {
      console.error(
        `GitHub API rate limit exceeded for ${systemName}, trying CDN fallback...`
      );
      return await this.fetchFromCdn(systemName);
    }

    return null;
  }

  /**
   * Try fetching manifest from GitHub Tree API.
   * Returns structured result indicating success, rate limiting, or other errors.
   */
  private async tryGitHubApi(systemName: string): Promise<GitHubApiResult> {
    // GitHub repo name: replace spaces with underscores, dashes with underscores
    const repoName = systemName.replace(/ /g, '_');
    const url = `${GITHUB_TREE_API}/${encodeURIComponent(repoName)}/git/trees/master?recursive=1`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Repository doesn't exist - return null for 404
      if (response.status === 404) {
        return {
          success: true,
          manifest: null,
          rateLimited: false,
        };
      }

      // Rate limited
      if (response.status === 403) {
        return {
          success: false,
          manifest: null,
          rateLimited: true,
          error: 'GitHub API rate limit exceeded',
        };
      }

      if (!response.ok) {
        return {
          success: false,
          manifest: null,
          rateLimited: false,
          error: `GitHub API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as GitHubTreeResponse;

      // Process tree entries into folder manifests
      const folders = this.processTreeEntries(data.tree);

      return {
        success: true,
        manifest: {
          folders,
          fetchedAt: Date.now(),
        },
        rateLimited: false,
      };
    } catch (err) {
      const error = err as Error;
      return {
        success: false,
        manifest: null,
        rateLimited: false,
        error: error.message,
      };
    }
  }

  /**
   * Fetch system manifest from CDN by scraping directory listings.
   * Falls back to this when GitHub API is rate-limited.
   */
  private async fetchFromCdn(systemName: string): Promise<SystemManifest | null> {
    const folders = new Map<string, FolderManifest>();

    for (const folder of CDN_TARGET_FOLDERS) {
      const folderManifest = await this.fetchFolderFromCdn(systemName, folder);
      if (folderManifest !== null) {
        folders.set(folder, folderManifest);
      }
    }

    // At least one folder must succeed
    if (folders.size === 0) {
      return null;
    }

    return { folders, fetchedAt: Date.now() };
  }

  /**
   * Fetch a single folder manifest from CDN directory listing.
   */
  private async fetchFolderFromCdn(
    systemName: string,
    folder: string
  ): Promise<FolderManifest | null> {
    const encodedSystem = encodeURIComponent(systemName);
    const url = `${LIBRETRO_CDN_BASE}/${encodedSystem}/${folder}/`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const filenames = parseCdnDirectory(html);

      if (filenames.length === 0) {
        return null;
      }

      // Build the folder manifest
      const filenameSet = new Set<string>(filenames);
      const lowercaseMap = new Map<string, string>();
      for (const filename of filenames) {
        lowercaseMap.set(filename.toLowerCase(), filename);
      }

      return {
        filenames: filenameSet,
        lowercaseMap,
      };
    } catch {
      return null;
    }
  }

  /**
   * Process GitHub Tree API entries into folder manifests.
   */
  private processTreeEntries(entries: GitHubTreeEntry[]): Map<string, FolderManifest> {
    const folders = new Map<string, FolderManifest>();

    for (const entry of entries) {
      // Only process blob (file) entries that are PNG files
      if (entry.type !== 'blob' || !entry.path.endsWith('.png')) {
        continue;
      }

      // Parse path: "Named_Boxarts/Game Name.png" -> folder="Named_Boxarts", filename="Game Name"
      const slashIndex = entry.path.indexOf('/');
      if (slashIndex === -1) {
        continue;
      }

      const folder = entry.path.slice(0, slashIndex);
      const filename = entry.path.slice(slashIndex + 1, -4); // Remove folder/ and .png

      // Get or create folder manifest
      let folderManifest = folders.get(folder);
      if (folderManifest === undefined) {
        folderManifest = {
          filenames: new Set(),
          lowercaseMap: new Map(),
        };
        folders.set(folder, folderManifest);
      }

      folderManifest.filenames.add(filename);
      folderManifest.lowercaseMap.set(filename.toLowerCase(), filename);
    }

    return folders;
  }

  /**
   * Check if an exact filename exists in the manifest.
   * @param manifest The manifest to search
   * @param filename Filename to look for (without extension)
   * @returns The exact filename if found, null otherwise
   */
  exactMatch(manifest: FolderManifest, filename: string): string | null {
    if (manifest.filenames.has(filename)) {
      return filename;
    }
    // Try case-insensitive
    const lower = filename.toLowerCase();
    const original = manifest.lowercaseMap.get(lower);
    return original ?? null;
  }

  /**
   * Find a matching filename in the manifest using title extraction.
   * @param manifest The manifest to search
   * @param filename Original filename to match
   * @returns Best matching filename and whether it's exact, or null
   */
  findMatch(
    manifest: FolderManifest,
    filename: string
  ): { match: string; bestEffort: boolean } | null {
    // Phase 1: Exact match
    const exact = this.exactMatch(manifest, filename);
    if (exact !== null) {
      return { match: exact, bestEffort: false };
    }

    // Phase 2: Strip variant tags but keep region
    const variantStripped = stripVariantTags(filename);
    if (variantStripped !== filename) {
      const variantMatch = this.exactMatch(manifest, variantStripped);
      if (variantMatch !== null) {
        return { match: variantMatch, bestEffort: true };
      }
    }

    // Phase 3: Title-only matching - find best match by base title
    const baseTitle = extractBaseTitle(filename);
    if (baseTitle !== null) {
      const titleMatch = this.findByTitle(manifest, baseTitle, filename);
      if (titleMatch !== null) {
        return { match: titleMatch, bestEffort: true };
      }
    }

    return null;
  }

  /**
   * Find best match by base title.
   * Looks for entries in manifest that start with the same base title.
   */
  private findByTitle(
    manifest: FolderManifest,
    baseTitle: string,
    originalFilename: string
  ): string | null {
    const baseTitleLower = baseTitle.toLowerCase();
    const candidates: string[] = [];

    // Find all entries that start with the base title
    for (const [lower, original] of manifest.lowercaseMap) {
      if (lower.startsWith(baseTitleLower)) {
        candidates.push(original);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0]!;
    }

    // Multiple candidates - prefer by region priority
    const originalRegion = extractRegion(originalFilename);
    return selectBestCandidate(candidates, originalRegion);
  }

  /**
   * Build the CDN URL for a matched filename.
   */
  buildUrl(systemId: number, mediaType: string, filename: string): string | null {
    const systemName = getLibretroSystemName(systemId);
    if (systemName === undefined) {
      return null;
    }

    const folder = MEDIA_TYPE_FOLDERS[mediaType] ?? 'Named_Boxarts';
    const encodedSystem = encodeURIComponent(systemName);
    const encodedName = encodeURIComponent(filename);

    return `${LIBRETRO_CDN_BASE}/${encodedSystem}/${folder}/${encodedName}.png`;
  }

  /**
   * Prefetch manifest for a system. Throws on errors.
   * Call this before processing ROMs to fail fast on API errors.
   * @param systemId ScreenScraper system ID
   * @throws Error if manifest cannot be fetched
   */
  async prefetch(systemId: number): Promise<void> {
    const systemName = getLibretroSystemName(systemId);
    if (systemName === undefined) {
      throw new Error(`Unsupported system ID: ${systemId}`);
    }

    // Check if already cached
    const cached = this.cache.get(systemId);
    if (cached !== undefined && cached.failed !== true) {
      return;
    }

    // Fetch and throw on errors (don't cache failures here)
    const manifest = await this.fetchSystemManifestOrThrow(systemName);
    this.cache.set(systemId, manifest);
  }

  /**
   * Fetch system manifest, throwing on errors instead of returning null.
   * Uses CDN fallback when GitHub API is rate-limited.
   */
  private async fetchSystemManifestOrThrow(systemName: string): Promise<SystemManifest> {
    // Try GitHub first
    const githubResult = await this.tryGitHubApi(systemName);

    if (githubResult.success) {
      // 404 means system not found
      if (githubResult.manifest === null) {
        throw new Error(`System not found on Libretro: ${systemName}`);
      }
      return githubResult.manifest;
    }

    // If rate limited, try CDN fallback
    if (githubResult.rateLimited) {
      console.error(
        `GitHub API rate limit exceeded for ${systemName}, trying CDN fallback...`
      );
      const cdnManifest = await this.fetchFromCdn(systemName);
      if (cdnManifest !== null) {
        return cdnManifest;
      }
      throw new Error(
        'GitHub API rate limit exceeded and CDN fallback failed. ' +
          'Try again later or check your network connection.'
      );
    }

    throw new Error(`Failed to fetch manifest for ${systemName}: ${githubResult.error}`);
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Variant tags to strip (but keep region tags).
 */
const VARIANT_PATTERNS: RegExp[] = [
  /\s*\(\d{4}-\d{2}-\d{2}\)/g, // Date: (1992-10-06)
  /\s*\(Proto(?:\s+\d+)?\)/gi,
  /\s*\(Beta(?:\s+\d+)?(?:\s+\d+)?\)/gi,
  /\s*\(Demo(?:\s+\d+)?\)/gi,
  /\s*\(Sample\)/gi,
  /\s*\(Kiosk\)/gi,
  /\s*\(e-Reader\)/gi,
  /\s*\(Virtual Console\)/gi,
  /\s*\(Switch Online\)/gi,
  /\s*\(Wii\)/gi,
  /\s*\(3DS Virtual Console\)/gi,
  /\s*\(Rev\s+\w+\)/gi,
  /\s*\(v[\d.]+\)/gi,
  /\s*\(Unl\)/gi,
  /\s*\(Pirate\)/gi,
  /\s*\(Retro-Bit\)/gi,
  /\s*\(Piko Interactive\)/gi,
  /\s*\(Hudson\)/gi,
  /\s*\(MB-\d+\)/gi,
  /\s*\(NINA-\d+\)/gi,
  /\s*\(Program\)/gi,
  /\s*\(Test Program\)/gi,
  /\s*\(Competition Cart\)/gi,
  /\s*\[b\]/gi, // Bad dump
  /^\[BIOS\]\s*/i,
];

/**
 * Strip variant tags from filename, keeping region tags.
 */
function stripVariantTags(filename: string): string {
  let result = filename;
  for (const pattern of VARIANT_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * Extract base title (everything before the first parenthesis or bracket).
 */
function extractBaseTitle(filename: string): string | null {
  // Match up to first ( or [
  const match = filename.match(/^([^([]+)/);
  if (match === null) {
    return null;
  }
  const title = match[1]!.trim();
  return title.length > 0 ? title : null;
}

/**
 * Extract region from filename.
 */
function extractRegion(filename: string): string | null {
  // Look for common region patterns
  const regionMatch = filename.match(
    /\((USA|World|Europe|Japan|Japan,\s*USA|USA,\s*Europe)[^)]*\)/i
  );
  return regionMatch !== null ? regionMatch[1]!.toLowerCase() : null;
}

/**
 * Select best candidate based on region priority.
 */
function selectBestCandidate(candidates: string[], preferredRegion: string | null): string {
  const regionPriority = ['world', 'usa', 'japan, usa', 'usa, europe', 'europe', 'japan'];

  // If we have a preferred region, try to match it first
  if (preferredRegion !== null) {
    for (const candidate of candidates) {
      const candidateRegion = extractRegion(candidate);
      if (candidateRegion === preferredRegion) {
        return candidate;
      }
    }
  }

  // Otherwise, use region priority
  for (const region of regionPriority) {
    for (const candidate of candidates) {
      const candidateRegion = extractRegion(candidate);
      if (candidateRegion === region) {
        return candidate;
      }
    }
  }

  // Fallback: return first candidate (alphabetically for consistency)
  candidates.sort();
  return candidates[0]!;
}

/** Singleton instance */
let manifestInstance: LibretroManifest | null = null;

/**
 * Get the shared manifest instance.
 */
export function getManifestInstance(options?: {
  userAgent?: string;
  timeoutMs?: number;
}): LibretroManifest {
  if (manifestInstance === null) {
    manifestInstance = new LibretroManifest(options);
  }
  return manifestInstance;
}

/**
 * Clear the shared manifest instance (for testing).
 */
export function clearManifestInstance(): void {
  if (manifestInstance !== null) {
    manifestInstance.clearCache();
    manifestInstance = null;
  }
}
