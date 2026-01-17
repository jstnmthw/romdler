import chalk from 'chalk';
import type { UrlStats, LogLevel } from '../types/index.js';
import type { DownloadProgress, DownloadResult } from '../downloader/types.js';
import { printBanner, printDryRunBanner } from './banner.js';
import { formatBytes, renderProgressBarString } from './progress.js';
import { renderUrlSummary, renderFinalSummary } from './summary.js';
import { ScrollingLog } from './scrolling-log.js';
import { StatusIcon, formatCounter } from './formatting.js';

/**
 * Decodes URL encoding for human-readable display.
 * Falls back to original string if decoding fails.
 */
function decodeForDisplay(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Console UI renderer that owns all stdout writes.
 * Provides in-place updates for progress without spamming the terminal.
 * Uses a scrolling log to show recent download results with progress bar below.
 */
export class Renderer {
  private isTTY: boolean;
  private logLevel: LogLevel;
  private scrollingLog: ScrollingLog | null = null;
  private dryRunLog: ScrollingLog | null = null;
  private currentFileIndex: number = -1;
  private downloadStartTime: number = 0;

  constructor(logLevel: LogLevel = 'info') {
    this.isTTY = process.stdout.isTTY === true;
    this.logLevel = logLevel;
  }

  /**
   * Prints the application banner.
   */
  banner(dryRun: boolean = false): void {
    if (this.logLevel === 'silent') {
      return;
    }
    if (dryRun) {
      printDryRunBanner();
    } else {
      printBanner();
    }
  }

  /**
   * Prints a message about starting to process a URL.
   */
  urlStart(url: string): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(chalk.white.bold(`URL: ${chalk.cyan(decodeForDisplay(url))}`));
  }

  /**
   * Prints the HTTP status for a URL fetch.
   */
  urlStatus(status: number, statusText: string): void {
    if (this.logLevel === 'silent') {
      return;
    }
    const statusColor = status >= 200 && status < 300 ? chalk.green : chalk.red;
    console.log(`  Status: ${statusColor(`${status} (${statusText})`)}`);
  }

  /**
   * Prints whether the table was found.
   */
  tableFound(found: boolean, tableId: string): void {
    if (this.logLevel === 'silent') {
      return;
    }
    if (found) {
      console.log(`  ${chalk.green('\u2714')} Table "${tableId}" found`);
    } else {
      console.log(`  ${chalk.red('\u2718')} Table "${tableId}" not found`);
    }
  }

  /**
   * Prints file counts after parsing.
   */
  fileCounts(totalFound: number, filtered: number, limit?: number): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(`  Files found: ${chalk.white(totalFound)}`);
    console.log(`  After filtering: ${chalk.cyan(`${filtered}/${totalFound}`)}`);
    if (limit !== undefined && limit < filtered) {
      console.log(`  Limited to: ${chalk.yellow(limit)} files`);
    }
    console.log('');
  }

  /**
   * Prints a debug message.
   */
  debug(message: string): void {
    if (this.logLevel !== 'debug') {
      return;
    }
    console.log(chalk.gray(`[debug] ${message}`));
  }

  /**
   * Prints an info message.
   */
  info(message: string): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(chalk.white(message));
  }

  /**
   * Prints a warning message.
   */
  warn(message: string): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(chalk.yellow(`Warning: ${message}`));
  }

  /**
   * Prints an error message.
   */
  error(message: string): void {
    console.error(chalk.red(`Error: ${message}`));
  }

  /**
   * Updates the download progress.
   * Uses scrolling log with progress bar rendered as the bottom line.
   */
  downloadProgress(progress: DownloadProgress, currentIndex: number, totalFiles: number): void {
    if (this.logLevel === 'silent' || !this.isTTY) {
      return;
    }

    // Initialize scrolling log on first download
    if (this.scrollingLog === null) {
      this.scrollingLog = new ScrollingLog({ maxLines: 8, persistOnDone: false });
    }

    // Track new file start
    if (currentIndex !== this.currentFileIndex) {
      this.downloadStartTime = Date.now();
      this.currentFileIndex = currentIndex;
    }

    // Render progress bar as string and set it on scrolling log
    const progressLine = renderProgressBarString({
      filename: progress.filename,
      bytesDownloaded: progress.bytesDownloaded,
      totalBytes: progress.totalBytes,
      startTime: this.downloadStartTime,
      fileIndex: currentIndex,
      totalFiles,
    });

    this.scrollingLog.setProgress(progressLine);
  }

  /**
   * Marks a download as complete and adds to scrolling log.
   * Shows file size in green for successful downloads.
   */
  downloadComplete(result: DownloadResult, index: number, total: number): void {
    if (this.logLevel === 'silent') {
      return;
    }

    const statusIcon =
      result.status === 'downloaded'
        ? StatusIcon.success
        : result.status === 'skipped'
          ? StatusIcon.skip
          : StatusIcon.error;

    // Show file size in green for downloads, status text for others
    const statusText =
      result.status === 'downloaded'
        ? chalk.green(formatBytes(result.bytesDownloaded))
        : result.status === 'skipped'
          ? chalk.yellow('skipped')
          : chalk.red(`failed: ${result.error ?? 'unknown'}`);

    const counter = formatCounter(index, total);

    const line = `${statusIcon} ${chalk.cyan(decodeForDisplay(result.filename))} ${statusText} ${counter}`;

    // Add to scrolling log if active (TTY mode), otherwise just print
    if (this.scrollingLog !== null && this.isTTY) {
      this.scrollingLog.clearProgress();
      this.scrollingLog.addLine(line);
    } else {
      console.log(line);
    }
  }

  /**
   * Finalizes the scrolling log display after all downloads complete.
   * Call this when switching to summary output.
   */
  finishDownloads(): void {
    if (this.scrollingLog !== null) {
      this.scrollingLog.done();
      this.scrollingLog = null;
    }
    this.currentFileIndex = -1;
  }

  /**
   * Prints dry run file list.
   */
  dryRunFile(filename: string, url: string, index: number, total: number): void {
    if (this.logLevel === 'silent') {
      return;
    }

    // Initialize scrolling log for dry run on first file
    if (this.dryRunLog === null && this.isTTY) {
      this.dryRunLog = new ScrollingLog({ maxLines: 8, persistOnDone: false });
    }

    const counter = formatCounter(index, total);
    const line = `  ${counter} ${chalk.cyan(decodeForDisplay(filename))}`;

    if (this.dryRunLog !== null) {
      this.dryRunLog.addLine(line);
    } else {
      console.log(line);
    }

    // Debug URL (only in non-TTY mode since scrolling log doesn't support multi-line per item)
    if (this.dryRunLog === null) {
      this.debug(`       ${decodeForDisplay(url)}`);
    }
  }

  /**
   * Finalizes dry run output.
   */
  finishDryRun(): void {
    if (this.dryRunLog !== null) {
      this.dryRunLog.done();
      this.dryRunLog = null;
    }
  }

  /**
   * Prints the summary for a single URL.
   */
  urlSummary(stats: UrlStats): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(renderUrlSummary(stats));
  }

  /**
   * Prints the final summary for all URLs.
   */
  finalSummary(allStats: UrlStats[]): void {
    if (this.logLevel === 'silent') {
      return;
    }
    console.log(renderFinalSummary(allStats));
  }

  /**
   * Prints URL processing error.
   */
  urlError(url: string, message: string): void {
    console.log(chalk.red(`\nFailed to process URL: ${decodeForDisplay(url)}`));
    console.log(chalk.red(`  ${message}\n`));
  }
}

export function createRenderer(logLevel: LogLevel = 'info'): Renderer {
  return new Renderer(logLevel);
}
