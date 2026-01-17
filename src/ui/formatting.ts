import chalk from 'chalk';

/**
 * Status icons used throughout the application.
 */
export const StatusIcon = {
  success: chalk.green('\u2714'), // ✓
  error: chalk.red('\u2718'), // ✗
  warning: chalk.red('!'),
  skip: chalk.yellow('\u21B7'), // ⇷
  pending: chalk.yellow('\u25CB'), // ○
  arrow: chalk.yellow('\u2192'), // →
  notFound: chalk.blue('?'),
  delete: chalk.red('x'),
  bestEffort: chalk.hex('#FFA500')('~'),
} as const;

/**
 * Formats a progress counter like [1/10] or [  5/100].
 * Pads the current index to match the width of the total.
 */
export function formatCounter(index: number, total: number): string {
  const current = String(index + 1).padStart(String(total).length);
  return chalk.gray(`[${current}/${total}]`);
}

/**
 * Formats a file size in bytes to human-readable string.
 * Re-exported from progress.ts for convenience.
 */
export { formatBytes } from './progress.js';
