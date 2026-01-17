import chalk from 'chalk';
import type { UrlStats } from '../types/index.js';

/**
 * Renders the summary statistics for a single URL.
 */
export function renderUrlSummary(stats: UrlStats): string {
  const boxWidth = 56;
  const title = 'Download Summary';
  const titlePadded = `  ${title}`.padEnd(boxWidth);

  const lines: string[] = [
    '',
    chalk.cyan.bold(`╔${'═'.repeat(boxWidth)}╗`),
    chalk.cyan.bold('║') + chalk.white.bold(titlePadded) + chalk.cyan.bold('║'),
    chalk.cyan.bold(`╚${'═'.repeat(boxWidth)}╝`),
    '',
    `  ${chalk.gray('Total found:')}     ${chalk.white(stats.totalFound)}`,
    `  ${chalk.gray('Filtered:')}        ${chalk.white(stats.filtered)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(stats.downloaded)}`,
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(stats.skipped)}`,
    `  ${chalk.gray('Failed:')}          ${stats.failed > 0 ? chalk.red(stats.failed) : chalk.white(stats.failed)}`,
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

  const boxWidth = 56;
  const title = 'Final Summary';
  const titlePadded = `  ${title}`.padEnd(boxWidth);

  const lines: string[] = [
    '',
    chalk.cyan.bold(`╔${'═'.repeat(boxWidth)}╗`),
    chalk.cyan.bold('║') + chalk.white.bold(titlePadded) + chalk.cyan.bold('║'),
    chalk.cyan.bold(`╚${'═'.repeat(boxWidth)}╝`),
    '',
    `  ${chalk.gray('URLs processed:')}  ${chalk.white(allStats.length)}`,
    `  ${chalk.gray('Total found:')}     ${chalk.white(totals.totalFound)}`,
    `  ${chalk.gray('Total filtered:')} ${chalk.white(totals.filtered)}`,
    `  ${chalk.gray('Downloaded:')}      ${chalk.green(totals.downloaded)}`,
    `  ${chalk.gray('Skipped:')}         ${chalk.yellow(totals.skipped)}`,
    `  ${chalk.gray('Failed:')}          ${totals.failed > 0 ? chalk.red(totals.failed) : chalk.white(totals.failed)}`,
    '',
  ];

  return lines.join('\n');
}
