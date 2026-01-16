import chalk from 'chalk';

const BAR_WIDTH = 30;

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

const FILLED_CHAR = '\u2588'; // █
const EMPTY_CHAR = '\u2591';  // ░

/**
 * Renders a progress bar string.
 */
export function renderProgressBar(
  current: number,
  total: number | null,
  width: number = BAR_WIDTH
): string {
  if (total === null || total === 0) {
    // Indeterminate progress - show animated pattern
    const pos = current % width;
    const bar = EMPTY_CHAR.repeat(pos) + FILLED_CHAR.repeat(3) + EMPTY_CHAR.repeat(Math.max(0, width - pos - 3));
    return chalk.cyan(`[${bar.slice(0, width)}]`);
  }

  const percentage = Math.min(current / total, 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;

  const filledStr = chalk.green(FILLED_CHAR.repeat(filled));
  const emptyStr = chalk.gray(EMPTY_CHAR.repeat(empty));
  const percentStr = `${Math.round(percentage * 100)}%`.padStart(4);

  return `[${filledStr}${emptyStr}] ${percentStr}`;
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
 * Renders the download progress line.
 */
export function renderDownloadProgress(
  filename: string,
  bytesDownloaded: number,
  totalBytes: number | null,
  currentIndex: number,
  totalFiles: number
): string {
  const decodedFilename = decodeForDisplay(filename);
  const truncatedFilename = truncateFilename(decodedFilename, 40);
  const bar = renderProgressBar(bytesDownloaded, totalBytes);
  const counter = chalk.gray(`${(currentIndex + 1).toString().padStart(String(totalFiles).length)}/${totalFiles}`);
  const size = totalBytes !== null
    ? chalk.gray(`${formatBytes(bytesDownloaded)}/${formatBytes(totalBytes)}`)
    : chalk.gray(formatBytes(bytesDownloaded));

  return `${chalk.white('Downloading:')} ${chalk.cyan(truncatedFilename)}\n${bar}  ${size}  ${counter}`;
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
    // Preserve extension
    const extension = filename.slice(ext);
    const baseName = filename.slice(0, maxLength - extension.length - 3);
    return `${baseName}...${extension}`;
  }

  return filename.slice(0, maxLength - 3) + '...';
}
