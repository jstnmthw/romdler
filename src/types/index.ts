export interface FileEntry {
  /** Original href from the anchor tag */
  href: string;
  /** Resolved absolute URL */
  url: string;
  /** Filename extracted from href */
  filename: string;
  /** Link text (visible text in the anchor) */
  linkText: string;
  /** Expected file size in bytes (from HTML table, if available) */
  expectedSize?: number;
}

export interface DownloadResult {
  filename: string;
  url: string;
  status: 'downloaded' | 'skipped' | 'failed';
  error?: string;
  bytesDownloaded?: number;
}

export interface UrlStats {
  url: string;
  totalFound: number;
  filtered: number;
  downloaded: number;
  skipped: number;
  failed: number;
  downloadDir: string;
}

export interface ProgressInfo {
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
  bytesDownloaded: number;
  totalBytes: number | null;
}

export type LogLevel = 'debug' | 'info' | 'silent';
