import chalk from 'chalk';
import type { ScrapeResult, ScrapeSummary } from './types.js';

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
export function renderScrapeSummary(summary: ScrapeSummary, imgsDir: string): string {
  const lines: string[] = [
    '',
    chalk.cyan.bold('─'.repeat(50)),
    chalk.white.bold('Scrape Summary'),
    chalk.cyan.bold('─'.repeat(50)),
    `  ${chalk.gray('Total ROMs:')}      ${chalk.white(summary.totalRoms)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(summary.downloaded)}`,
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(summary.skipped)}`,
    `  ${chalk.gray('Not found:')}       ${chalk.blue(summary.notFound)}`,
    `  ${chalk.gray('Failed:')}          ${summary.failed > 0 ? chalk.red(summary.failed) : chalk.white(summary.failed)}`,
    '',
    `  ${chalk.gray('Duration:')}        ${chalk.white(formatDuration(summary.elapsedMs))}`,
    `  ${chalk.gray('Output:')}          ${chalk.cyan(imgsDir)}`,
    chalk.cyan.bold('─'.repeat(50)),
    '',
  ];

  if (summary.failed > 0) {
    lines.push(chalk.red('Some images failed to download. Check the logs above for details.'));
    lines.push('');
  }

  if (summary.notFound > 0) {
    lines.push(chalk.blue(`${summary.notFound} ROMs were not found in the ScreenScraper database.`));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render a single scrape result for logging
 */
export function renderScrapeResult(result: ScrapeResult, index: number, total: number): string {
  const prefix = chalk.gray(`[${index + 1}/${total}]`);
  const filename = result.rom.filename;

  switch (result.status) {
    case 'downloaded':
      return `${prefix} ${chalk.green('✓')} ${filename} ${chalk.gray('→')} ${chalk.cyan(result.gameName ?? 'Unknown')}`;

    case 'skipped':
      return `${prefix} ${chalk.yellow('○')} ${filename} ${chalk.gray('(already exists)')}`;

    case 'not_found':
      return `${prefix} ${chalk.blue('?')} ${filename} ${chalk.gray('(not in database)')}`;

    case 'failed':
      return `${prefix} ${chalk.red('✗')} ${filename} ${chalk.gray('-')} ${chalk.red(result.error ?? 'Unknown error')}`;

    default:
      return `${prefix} ${chalk.gray('·')} ${filename}`;
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
    const status = result.status === 'skipped' ? chalk.gray('(skip - exists)') : chalk.gray('(will scrape)');
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
    elapsedMs,
  };
}
