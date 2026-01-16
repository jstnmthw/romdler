export interface DownloadOptions {
  userAgent: string;
  timeoutMs: number;
  retries: number;
  downloadDir: string;
}

export interface DownloadProgress {
  filename: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  percentage: number | null;
}

export type DownloadStatus = 'downloaded' | 'skipped' | 'failed';

export interface DownloadResult {
  filename: string;
  url: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;
