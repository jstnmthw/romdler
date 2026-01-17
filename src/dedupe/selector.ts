import type { DedupePreferences } from '../config/index.js';
import type { DedupeRomFile } from './types.js';

/** Default preferences when none configured */
const DEFAULT_PREFERENCES: DedupePreferences = {
  regions: ['USA', 'World', 'Europe', 'Japan'],
  avoid: [
    'Proto',
    'Beta',
    'Sample',
    'Demo',
    'Preview',
    'Promo',
    'Unl',
    'Pirate',
    'Aftermarket',
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
    'Capcom Classics',
    'Namco Museum',
    'Konami Collector',
    'Anniversary Collection',
    'Mega Man Legacy',
    'Disney Classic',
    'Rev',
    'Alt',
  ],
  tiebreaker: 'shortest',
};

/**
 * Count how many "avoid" tokens a file contains
 * @param file - ROM file to check
 * @param avoidList - List of tokens to avoid
 * @returns Number of avoid tokens found
 */
function countAvoidTokens(file: DedupeRomFile, avoidList: string[]): number {
  let count = 0;
  const filename = file.filename.toLowerCase();

  for (const avoid of avoidList) {
    const avoidLower = avoid.toLowerCase();
    // Check if the avoid term appears in the filename
    if (filename.includes(avoidLower)) {
      count++;
    }
  }

  return count;
}

/**
 * Get the best region priority for a file (lower = better)
 * @param file - ROM file to check
 * @param regionPriority - Ordered list of preferred regions
 * @returns Priority index (lower is better), or Infinity if no preferred region
 */
function getRegionPriority(file: DedupeRomFile, regionPriority: string[]): number {
  const fileRegions = file.parsed.regions.map((r) => r.toLowerCase());

  for (let i = 0; i < regionPriority.length; i++) {
    const preferred = regionPriority[i];
    if (preferred !== undefined && fileRegions.includes(preferred.toLowerCase())) {
      return i;
    }
  }

  // No preferred region found
  return Infinity;
}

/**
 * Compare two files and return which is preferred
 * @param a - First file
 * @param b - Second file
 * @param prefs - User preferences
 * @returns Negative if a is preferred, positive if b is preferred, 0 if equal
 */
function compareFiles(a: DedupeRomFile, b: DedupeRomFile, prefs: DedupePreferences): number {
  // 1. Fewer avoid tokens = better
  const aAvoid = countAvoidTokens(a, prefs.avoid);
  const bAvoid = countAvoidTokens(b, prefs.avoid);
  if (aAvoid !== bAvoid) {
    return aAvoid - bAvoid;
  }

  // 2. Better region priority = better (lower index)
  const aRegion = getRegionPriority(a, prefs.regions);
  const bRegion = getRegionPriority(b, prefs.regions);
  if (aRegion !== bRegion) {
    return aRegion - bRegion;
  }

  // 3. Tiebreaker
  if (prefs.tiebreaker === 'shortest') {
    // Shorter filename = better (fewer modifiers usually)
    const lenDiff = a.filename.length - b.filename.length;
    if (lenDiff !== 0) {
      return lenDiff;
    }
  }

  // 4. Final tiebreaker: alphabetical
  return a.filename.localeCompare(b.filename);
}

/**
 * Select the preferred file from a group of duplicates
 * @param files - Array of ROM files in the same group
 * @param preferences - User preferences (optional, uses defaults if not provided)
 * @returns Object with preferred file and files to remove
 */
export function selectPreferred(
  files: DedupeRomFile[],
  preferences?: DedupePreferences
): { preferred: DedupeRomFile; toRemove: DedupeRomFile[] } {
  const prefs = preferences ?? DEFAULT_PREFERENCES;

  if (files.length === 0) {
    throw new Error('Cannot select from empty file list');
  }

  if (files.length === 1) {
    // Safe: length check guarantees files[0] exists
    return { preferred: files[0]!, toRemove: [] };
  }

  // Sort files by preference (best first)
  const sorted = [...files].sort((a, b) => compareFiles(a, b, prefs));

  // Safe: length > 1 guarantees sorted[0] exists after sort
  const preferred = sorted[0]!;
  const toRemove = sorted.slice(1);

  return { preferred, toRemove };
}

/**
 * Get the default preferences
 * @returns Default dedupe preferences
 */
export function getDefaultPreferences(): DedupePreferences {
  return { ...DEFAULT_PREFERENCES };
}
