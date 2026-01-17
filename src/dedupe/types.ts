/** Parsed ROM filename with extracted components */
export type ParsedRomName = {
  /** Original filename */
  filename: string;
  /** Game title extracted from filename */
  title: string;
  /** Region codes (e.g., ['USA', 'Europe']) */
  regions: string[];
  /** Quality modifiers that define identity (e.g., ['SGB Enhanced', 'GB Compatible']) */
  qualityModifiers: string[];
  /** Variant indicators that mark non-clean versions (e.g., ['Rev 1', 'Beta']) */
  variantIndicators: string[];
  /** Extra unrecognized tokens (make file less preferred) */
  extraTokens: string[];
  /** Whether this is a clean version (no variant indicators or extra tokens) */
  isClean: boolean;
  /** Base signature for grouping (title + regions + quality modifiers) */
  baseSignature: string;
};

/** File entry for dedupe operations */
export type DedupeRomFile = {
  /** Absolute path to the file */
  path: string;
  /** Filename (for display and parsing) */
  filename: string;
  /** Parsed ROM name components */
  parsed: ParsedRomName;
};

/** Group of ROM files with the same base signature */
export type RomGroup = {
  /** Base signature shared by all files in group */
  signature: string;
  /** Display title for the group */
  displayTitle: string;
  /** Preferred (clean) version if one exists */
  preferred: DedupeRomFile | null;
  /** Variant versions (non-clean) */
  variants: DedupeRomFile[];
  /** Files marked for removal */
  toRemove: DedupeRomFile[];
  /** Files to keep */
  toKeep: DedupeRomFile[];
};

/** Result of deduping a single file */
export type DedupeResult = {
  /** The file that was processed */
  file: DedupeRomFile;
  /** Result status */
  status: 'removed' | 'kept' | 'failed';
  /** Error message if failed */
  error?: string;
};

/** Summary statistics for dedupe operation */
export type DedupeSummary = {
  /** Total files scanned */
  totalScanned: number;
  /** Number of groups with duplicates */
  groupsWithDuplicates: number;
  /** Files removed */
  removed: number;
  /** Files kept */
  kept: number;
  /** Files that failed to remove */
  failed: number;
};
