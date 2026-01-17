import chalk from 'chalk';
import type { UrlStats } from '../types/index.js';

/**
 * Renders the summary statistics for a single URL.
 */
export function renderUrlSummary(stats: UrlStats): string {
  const lines: string[] = [
    '',
    chalk.cyan.bold('─'.repeat(50)),
    chalk.white.bold('Summary'),
    chalk.cyan.bold('─'.repeat(50)),
    `  ${chalk.gray('Total found:')}     ${chalk.white(stats.totalFound)}`,
    `  ${chalk.gray('Filtered:')}        ${chalk.white(stats.filtered)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(stats.downloaded)}`,
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(stats.skipped)}`,
    `  ${chalk.gray('Failed:')}          ${stats.failed > 0 ? chalk.red(stats.failed) : chalk.white(stats.failed)}`,
    '',
    `  ${chalk.gray('Destination:')}     ${chalk.cyan(stats.downloadDir)}`,
    '',
    '',
  ];

  return lines.join('\n');
}

/**
 * Renders the final summary for all URLs.
 */
export function renderFinalSummary(allStats: UrlStats[]): string {
  const totals = allStats.reduce(
    (acc, stats) => ({
      totalFound: acc.totalFound + stats.totalFound,
      filtered: acc.filtered + stats.filtered,
      downloaded: acc.downloaded + stats.downloaded,
      skipped: acc.skipped + stats.skipped,
      failed: acc.failed + stats.failed,
    }),
    { totalFound: 0, filtered: 0, downloaded: 0, skipped: 0, failed: 0 }
  );

  const lines: string[] = [
    '',
    chalk.cyan.bold('═'.repeat(50)),
    chalk.white.bold('Final Summary'),
    chalk.cyan.bold('═'.repeat(50)),
    `  ${chalk.gray('URLs processed:')}  ${chalk.white(allStats.length)}`,
    `  ${chalk.gray('Total found:')}     ${chalk.white(totals.totalFound)}`,
    `  ${chalk.gray('Total filtered:')} ${chalk.white(totals.filtered)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(totals.downloaded)}`,
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(totals.skipped)}`,
    `  ${chalk.gray('Failed:')}          ${totals.failed > 0 ? chalk.red(totals.failed) : chalk.white(totals.failed)}`,
    chalk.cyan.bold('═'.repeat(50)),
    '',
  ];

  if (totals.failed > 0) {
    lines.push(chalk.red('Some downloads failed. Check the logs above for details.'));
    lines.push('');
  }

  return lines.join('\n');
}
