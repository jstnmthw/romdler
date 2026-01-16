import chalk from 'chalk';
import type { UrlStats, LogLevel } from '../types/index.js';
import type { DownloadProgress, DownloadResult } from '../downloader/types.js';
import { printBanner, printDryRunBanner } from './banner.js';
import { renderDownloadProgress } from './progress.js';
import { renderUrlSummary, renderFinalSummary } from './summary.js';

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
 */
export class Renderer {
  private isTTY: boolean;
  private logLevel: LogLevel;
  private progressLines = 0;

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
   * Clears the current progress lines for in-place updates.
   */
  private clearProgress(): void {
    if (!this.isTTY || this.progressLines === 0) {
      return;
    }

    // Move cursor up and clear lines
    for (let i = 0; i < this.progressLines; i++) {
      process.stdout.write('\x1B[A'); // Move up
      process.stdout.write('\x1B[K'); // Clear line
    }
    this.progressLines = 0;
  }

  /**
   * Updates the download progress in place.
   */
  downloadProgress(
    progress: DownloadProgress,
    currentIndex: number,
    totalFiles: number
  ): void {
    if (this.logLevel === 'silent') {
      return;
    }

    const output = renderDownloadProgress(
      progress.filename,
      progress.bytesDownloaded,
      progress.totalBytes,
      currentIndex,
      totalFiles
    );

    if (this.isTTY) {
      this.clearProgress();
      process.stdout.write(output);
      this.progressLines = output.split('\n').length;
    }
  }

  /**
   * Marks a download as complete and moves to next line.
   */
  downloadComplete(result: DownloadResult, index: number, total: number): void {
    if (this.logLevel === 'silent') {
      return;
    }

    this.clearProgress();

    const statusIcon =
      result.status === 'downloaded'
        ? chalk.green('\u2714')
        : result.status === 'skipped'
          ? chalk.yellow('\u21B7')
          : chalk.red('\u2718');

    const statusText =
      result.status === 'downloaded'
        ? chalk.green('downloaded')
        : result.status === 'skipped'
          ? chalk.yellow('skipped')
          : chalk.red(`failed: ${result.error ?? 'unknown'}`);

    const counter = chalk.gray(
      `[${(index + 1).toString().padStart(String(total).length)}/${total}]`
    );

    console.log(`${statusIcon} ${chalk.cyan(decodeForDisplay(result.filename))} ${statusText} ${counter}`);
  }

  /**
   * Prints dry run file list.
   */
  dryRunFile(filename: string, url: string, index: number, total: number): void {
    if (this.logLevel === 'silent') {
      return;
    }
    const counter = chalk.gray(
      `[${(index + 1).toString().padStart(String(total).length)}/${total}]`
    );
    console.log(`  ${counter} ${chalk.cyan(decodeForDisplay(filename))}`);
    this.debug(`       ${decodeForDisplay(url)}`);
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
