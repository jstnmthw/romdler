/** File entry for purge operations */
export type PurgeFileEntry = {
  /** Absolute path to the file */
  path: string;
  /** Filename (for display and filter matching) */
  filename: string;
};

/** Result of purging a single file */
export type PurgeResult = {
  file: PurgeFileEntry;
  status: 'deleted' | 'skipped' | 'failed';
  error?: string;
};

/** Summary statistics for purge operation */
export type PurgeSummary = {
  totalScanned: number;
  matchedBlacklist: number;
  deleted: number;
  failed: number;
};
