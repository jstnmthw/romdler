import type { DedupePreferences } from '../config/index.js';
import type { DedupeRomFile, RomGroup } from './types.js';
import { selectPreferred } from './selector.js';

/**
 * Group ROM files by their base signature
 * @param roms - Array of ROM files with parsed names
 * @returns Map of signature to array of files
 */
export function groupRomsBySignature(roms: DedupeRomFile[]): Map<string, DedupeRomFile[]> {
  const groups = new Map<string, DedupeRomFile[]>();

  for (const rom of roms) {
    const signature = rom.parsed.baseSignature;
    const existing = groups.get(signature);

    if (existing !== undefined) {
      existing.push(rom);
    } else {
      groups.set(signature, [rom]);
    }
  }

  return groups;
}

/**
 * Analyze a group of ROM files to determine preferred version and what to remove
 * Uses preference-based selection to pick the best file from each group
 * @param signature - Base signature for the group
 * @param files - Array of ROM files in the group
 * @param preferences - Optional user preferences for selection
 * @returns Analyzed ROM group with preferred/variant/removal lists
 */
export function analyzeGroup(
  signature: string,
  files: DedupeRomFile[],
  preferences?: DedupePreferences
): RomGroup {
  // Use first file's title as display title (sorted for consistency)
  const sorted = [...files].sort((a, b) => a.filename.localeCompare(b.filename));
  const firstFile = sorted[0];
  const displayTitle = firstFile !== undefined ? firstFile.parsed.title : 'Unknown';

  // Single file - nothing to dedupe
  if (files.length === 1 && firstFile !== undefined) {
    return {
      signature,
      displayTitle,
      preferred: firstFile,
      variants: [],
      toRemove: [],
      toKeep: [firstFile],
    };
  }

  // Use preference-based selection to pick the best file
  const { preferred, toRemove } = selectPreferred(files, preferences);

  // Identify variant versions (non-clean)
  const variantVersions = files.filter((f) => !f.parsed.isClean);

  return {
    signature,
    displayTitle,
    preferred,
    variants: variantVersions,
    toRemove,
    toKeep: [preferred],
  };
}

/**
 * Filter groups to only those with files to remove
 * @param groups - All analyzed groups
 * @returns Groups that have duplicates to remove
 */
export function getGroupsWithDuplicates(groups: RomGroup[]): RomGroup[] {
  return groups.filter((group) => group.toRemove.length > 0);
}
