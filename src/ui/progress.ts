import cliProgress from 'cli-progress';
import chalk from 'chalk';

/**
 * Decodes URL encoding for human-readable display.
 */
function decodeForDisplay(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Formats bytes to human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Formats speed to human-readable string.
 */
function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) {
    return '0 KB/s';
  }

  const kbps = bytesPerSecond / 1024;
  if (kbps < 1024) {
    return `${kbps.toFixed(1)} KB/s`;
  }

  const mbps = kbps / 1024;
  return `${mbps.toFixed(1)} MB/s`;
}

/**
 * Truncates a filename to fit within a maximum length.
 */
function truncateFilename(filename: string, maxLength: number): string {
  if (filename.length <= maxLength) {
    return filename.padEnd(maxLength);
  }

  const ext = filename.lastIndexOf('.');
  if (ext > 0 && filename.length - ext <= 6) {
    const extension = filename.slice(ext);
    const baseName = filename.slice(0, maxLength - extension.length - 3);
    return `${baseName}...${extension}`;
  }

  return filename.slice(0, maxLength - 3) + '...';
}

/**
 * Progress bar manager using cli-progress.
 */
export class ProgressBar {
  private bar: cliProgress.SingleBar;
  private startTime: number = 0;
  // Cached values to avoid recalculation on every update
  private truncatedFilename: string = '';
  private fileProgressStr: string = '';
  private totalBytesStr: string = '';

  constructor() {
    this.bar = new cliProgress.SingleBar(
      {
        format: `${chalk.cyan('{filename}')} |${chalk.green('{bar}')}| {percentage}% | {size} | {speed} | {fileProgress}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: true,
        stopOnComplete: false,
        forceRedraw: true,
      },
      cliProgress.Presets.shades_classic
    );
  }

  /**
   * Starts progress tracking for a new file.
   */
  start(filename: string, totalBytes: number | null, fileIndex: number, totalFiles: number): void {
    this.startTime = Date.now();

    // Cache values that don't change during download
    this.truncatedFilename = truncateFilename(decodeForDisplay(filename), 40);
    this.fileProgressStr = `${fileIndex + 1}/${totalFiles}`;
    this.totalBytesStr = totalBytes !== null ? formatBytes(totalBytes) : '?';

    const total = totalBytes ?? 0;
    this.bar.start(total, 0, {
      filename: this.truncatedFilename,
      size: `0 B/${this.totalBytesStr}`,
      speed: '-- KB/s',
      fileProgress: this.fileProgressStr,
    });
  }

  /**
   * Updates the progress bar.
   */
  update(bytesDownloaded: number, _totalBytes: number | null): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? bytesDownloaded / elapsed : 0;

    this.bar.update(bytesDownloaded, {
      filename: this.truncatedFilename,
      size: `${formatBytes(bytesDownloaded)}/${this.totalBytesStr}`,
      speed: formatSpeed(speed),
      fileProgress: this.fileProgressStr,
    });
  }

  /**
   * Stops the progress bar.
   */
  stop(): void {
    this.bar.stop();
  }
}

/**
 * Creates a new progress bar instance.
 */
export function createProgressBar(): ProgressBar {
  return new ProgressBar();
}

/**
 * Options for rendering a progress bar string.
 */
export type ProgressBarStringOptions = {
  filename: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  startTime: number;
  fileIndex: number;
  totalFiles: number;
  barWidth?: number;
};

/**
 * Renders a progress bar as a string for use in scrolling log displays.
 * Returns a formatted string like: "filename.zip |████░░░░| 50% | 5.2 MB/10.4 MB | 1.2 MB/s | 1/5"
 */
export function renderProgressBarString(options: ProgressBarStringOptions): string {
  const {
    filename,
    bytesDownloaded,
    totalBytes,
    startTime,
    fileIndex,
    totalFiles,
    barWidth = 20,
  } = options;

  // Truncate filename
  const truncated = truncateFilename(decodeForDisplay(filename), 40);

  // Calculate percentage
  const percentage =
    totalBytes !== null && totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0;

  // Build progress bar
  const filledWidth =
    totalBytes !== null && totalBytes > 0
      ? Math.round((bytesDownloaded / totalBytes) * barWidth)
      : 0;
  const emptyWidth = barWidth - filledWidth;
  const bar = '\u2588'.repeat(filledWidth) + '\u2591'.repeat(emptyWidth);

  // Format sizes
  const downloadedStr = formatBytes(bytesDownloaded);
  const totalStr = totalBytes !== null ? formatBytes(totalBytes) : '?';

  // Calculate speed
  const elapsed = (Date.now() - startTime) / 1000;
  const speed = elapsed > 0 ? bytesDownloaded / elapsed : 0;
  const speedStr = formatSpeed(speed);

  // File progress
  const fileProgress = `${fileIndex + 1}/${totalFiles}`;

  // Filename on first line, empty line, then progress bar (indented to align)
  return `${chalk.cyan(truncated)}\n\n  |${chalk.green(bar)}| ${percentage}% | ${downloadedStr}/${totalStr} | ${speedStr} | ${fileProgress}`;
}
