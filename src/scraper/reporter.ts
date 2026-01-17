import chalk from 'chalk';
import type { ScrapeResult, ScrapeSummary } from './types.js';
import { formatBytes } from '../ui/progress.js';

/**
 * Format milliseconds into human-readable duration
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Render scrape summary to console
 */
export function renderScrapeSummary(summary: ScrapeSummary): string {
  const boxWidth = 56;
  const title = 'Scrape Summary';
  const titlePadded = `  ${title}`.padEnd(boxWidth);

  const lines: string[] = [
    '',
    chalk.cyan.bold(`╔${'═'.repeat(boxWidth)}╗`),
    chalk.cyan.bold('║') + chalk.white.bold(titlePadded) + chalk.cyan.bold('║'),
    chalk.cyan.bold(`╚${'═'.repeat(boxWidth)}╝`),
    '',
    `  ${chalk.gray('Total ROMs:')}      ${chalk.white(summary.totalRoms)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(summary.downloaded)}`,
  ];

  lines.push(
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(summary.skipped)}`,
    `  ${chalk.gray('Not found:')}       ${chalk.blue(summary.notFound)}`,
    `  ${chalk.gray('Best effort:')}     ${summary.bestEffort > 0 ? chalk.hex('#FFA500')(summary.bestEffort) : chalk.white(summary.bestEffort)}`,
    `  ${chalk.gray('Failed:')}          ${summary.failed > 0 ? chalk.red(summary.failed) : chalk.white(summary.failed)}`,
    `  ${chalk.gray('Duration:')}        ${chalk.white(formatDuration(summary.elapsedMs))}`,
    ''
  );


  return lines.join('\n');
}

/** Amber/orange color for best-effort matches */
const amber = chalk.hex('#FFA500');

/**
 * Render a single scrape result for logging
 * Format: [index/total] icon filename → gameName size
 */
export function renderScrapeResult(result: ScrapeResult, index: number, total: number): string {
  const counter = chalk.gray(`[${String(index + 1).padStart(String(total).length)}/${total}]`);
  const filename = result.rom.filename;

  switch (result.status) {
    case 'downloaded': {
      const sizeStr =
        result.imageSize !== undefined ? ` ${chalk.green(formatBytes(result.imageSize))}` : '';
      if (result.bestEffort === true) {
        // Best-effort match: show in amber with size
        return `${counter} ${amber('~')} ${filename} ${chalk.gray('→')} ${amber(result.gameName ?? 'Unknown')}${sizeStr} ${chalk.gray('(best effort)')}`;
      }
      // Exact match: show in green with size
      return `${counter} ${chalk.green('✓')} ${filename} ${chalk.gray('→')} ${result.gameName ?? 'Unknown'}${sizeStr}`;
    }

    case 'skipped':
      return `${counter} ${chalk.yellow('○')} ${filename} ${chalk.gray('(already exists)')}`;

    case 'not_found':
      return `${counter} ${chalk.blue('?')} ${filename} ${chalk.gray('(not in database)')}`;

    case 'failed':
      return `${counter} ${chalk.red('✗')} ${filename} ${chalk.gray('-')} ${chalk.red(result.error ?? 'Unknown error')}`;

    default:
      return `${counter} ${chalk.gray('·')} ${filename}`;
  }
}

/**
 * Render dry-run preview header
 */
export function renderDryRunHeader(totalRoms: number, toScrape: number): string {
  const lines: string[] = [
    '',
    chalk.cyan.bold('─'.repeat(50)),
    chalk.white.bold('Scrape Preview (Dry Run)'),
    chalk.cyan.bold('─'.repeat(50)),
    `  ${chalk.gray('Total ROMs:')}      ${chalk.white(totalRoms)}`,
    `  ${chalk.gray('To scrape:')}       ${chalk.cyan(toScrape)}`,
    chalk.cyan.bold('─'.repeat(50)),
    '',
  ];

  return lines.join('\n');
}

/**
 * Render list of ROMs for dry-run preview
 */
export function renderDryRunList(results: ScrapeResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    const icon = result.status === 'skipped' ? chalk.yellow('○') : chalk.cyan('→');
    const status =
      result.status === 'skipped' ? chalk.gray('(skip - exists)') : chalk.gray('(will scrape)');
    lines.push(`  ${icon} ${result.rom.filename} ${status}`);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Calculate summary from scrape results
 */
export function calculateSummary(results: ScrapeResult[], elapsedMs: number): ScrapeSummary {
  return {
    totalRoms: results.length,
    downloaded: results.filter((r) => r.status === 'downloaded').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    notFound: results.filter((r) => r.status === 'not_found').length,
    failed: results.filter((r) => r.status === 'failed').length,
    bestEffort: results.filter((r) => r.status === 'downloaded' && r.bestEffort === true).length,
    elapsedMs,
  };
}
