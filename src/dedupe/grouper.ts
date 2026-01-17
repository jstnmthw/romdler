import type { DedupeRomFile, RomGroup } from './types.js';

/**
 * Group ROM files by their base signature
 * @param roms - Array of ROM files with parsed names
 * @returns Map of signature to array of files
 */
export function groupRomsBySignature(
  roms: DedupeRomFile[]
): Map<string, DedupeRomFile[]> {
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
 * @param signature - Base signature for the group
 * @param files - Array of ROM files in the group
 * @returns Analyzed ROM group with preferred/variant/removal lists
 */
export function analyzeGroup(
  signature: string,
  files: DedupeRomFile[]
): RomGroup {
  // Sort files: clean versions first, then by filename
  const sorted = [...files].sort((a, b) => {
    // Clean versions come first
    if (a.parsed.isClean && !b.parsed.isClean) {
      return -1;
    }
    if (!a.parsed.isClean && b.parsed.isClean) {
      return 1;
    }
    // Then sort by filename
    return a.filename.localeCompare(b.filename);
  });

  // Separate clean and variant versions
  const cleanVersions = sorted.filter((f) => f.parsed.isClean);
  const variantVersions = sorted.filter((f) => !f.parsed.isClean);

  // Use first file's title as display title
  const firstFile = sorted[0];
  const displayTitle =
    firstFile !== undefined ? firstFile.parsed.title : 'Unknown';

  // Determine preferred version and what to remove
  let preferred: DedupeRomFile | null = null;
  const toRemove: DedupeRomFile[] = [];
  const toKeep: DedupeRomFile[] = [];

  if (cleanVersions.length > 0) {
    // If we have clean versions, the first one is preferred
    const firstClean = cleanVersions[0];
    if (firstClean !== undefined) {
      preferred = firstClean;
      toKeep.push(firstClean);
    }

    // Additional clean versions are also kept (they may have different modifiers)
    for (let i = 1; i < cleanVersions.length; i++) {
      const cleanFile = cleanVersions[i];
      if (cleanFile !== undefined) {
        toKeep.push(cleanFile);
      }
    }

    // All variant versions are marked for removal
    for (const variant of variantVersions) {
      toRemove.push(variant);
    }
  } else {
    // No clean versions - keep all variants (nothing to prefer)
    for (const variant of variantVersions) {
      toKeep.push(variant);
    }
  }

  return {
    signature,
    displayTitle,
    preferred,
    variants: variantVersions,
    toRemove,
    toKeep,
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
