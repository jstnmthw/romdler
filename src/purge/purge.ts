import path from 'path';
import chalk from 'chalk';
import type { Config, ResolvedSystemConfig } from '../config/index.js';
import { resolveSystemConfig } from '../config/index.js';
import { parseFilterExpression, matchesExpression } from '../filter/index.js';
import { safeDelete } from '../utils/index.js';
import { ProgressRenderer, StatusIcon, formatCounter } from '../ui/index.js';
import type { PurgeFileEntry, PurgeResult, PurgeSummary } from './types.js';
import { scanDownloadDir } from './scanner.js';

export type PurgeOptions = {
  dryRun: boolean;
  limit?: number;
};

/**
 * Find files matching the blacklist
 * @param files - Files to check
 * @param blacklist - Blacklist filter strings
 * @returns Files that match the blacklist (should be deleted)
 */
function findBlacklistedFiles(files: PurgeFileEntry[], blacklist: string[]): PurgeFileEntry[] {
  if (blacklist.length === 0) {
    return [];
  }

  const expression = parseFilterExpression(blacklist);

  return files.filter((file) => {
    // For purge, we only match against filename (no linkText available)
    return matchesExpression(file.filename, expression);
  });
}

/**
 * Delete a single file
 */
async function deleteFile(file: PurgeFileEntry): Promise<PurgeResult> {
  try {
    await safeDelete(file.path);
    return {
      file,
      status: 'deleted',
    };
  } catch (err) {
    const error = err as Error;
    return {
      file,
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Print header for purge operation
 */
function printHeader(downloadDir: string, dryRun: boolean): void {
  const boxWidth = 56;
  const title = 'Purge Blacklisted Files';
  const titlePadded = `  ${title}`.padEnd(boxWidth);

  console.log('');
  console.log(chalk.cyan.bold(`╔${'═'.repeat(boxWidth)}╗`));
  console.log(chalk.cyan.bold('║') + chalk.white.bold(titlePadded) + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold(`╚${'═'.repeat(boxWidth)}╝`));
  console.log('');

  if (dryRun) {
    console.log(chalk.yellow.bold('  [DRY RUN] No files will be deleted'));
    console.log('');
  }

  console.log(`  ${chalk.gray('Directory:')} ${chalk.white(downloadDir)}`);
}

/**
 * Print dry-run preview of files to delete
 */
function printDryRunPreview(files: PurgeFileEntry[]): PurgeResult[] {
  console.log(chalk.white('Files that would be deleted:'));

  const renderer = new ProgressRenderer();
  for (const file of files) {
    renderer.addLine(`  ${StatusIcon.delete} ${file.filename}`);
  }
  renderer.done();
  console.log('');

  return files.map((file) => ({
    file,
    status: 'skipped' as const,
  }));
}

/**
 * Delete files and print progress
 */
async function deleteFiles(files: PurgeFileEntry[]): Promise<PurgeResult[]> {
  const results: PurgeResult[] = [];
  const total = files.length;
  const renderer = new ProgressRenderer();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file === undefined) {
      continue;
    }

    const result = await deleteFile(file);
    results.push(result);

    const counter = formatCounter(i, total);
    const line =
      result.status === 'deleted'
        ? `${counter} ${StatusIcon.delete} ${result.file.filename}`
        : `${counter} ${StatusIcon.warning} ${result.file.filename} ${chalk.red(`(${result.error ?? 'unknown error'})`)}`;

    renderer.addLine(line);
  }

  renderer.done();
  return results;
}

/**
 * Calculate summary from purge results
 */
function calculateSummary(totalScanned: number, results: PurgeResult[]): PurgeSummary {
  return {
    totalScanned,
    matchedBlacklist: results.length,
    deleted: results.filter((r) => r.status === 'deleted').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}

/**
 * Print purge summary
 */
function printSummary(summary: PurgeSummary): void {
  const boxWidth = 56;
  const title = 'Purge Summary';
  const titlePadded = `  ${title}`.padEnd(boxWidth);

  console.log('');
  console.log(chalk.cyan.bold(`╔${'═'.repeat(boxWidth)}╗`));
  console.log(chalk.cyan.bold('║') + chalk.white.bold(titlePadded) + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold(`╚${'═'.repeat(boxWidth)}╝`));
  console.log('');
  console.log(`  ${chalk.gray('Scanned:')}         ${chalk.white(summary.totalScanned)}`);
  console.log(`  ${chalk.gray('Matched:')}         ${chalk.red(summary.matchedBlacklist)}`);
  console.log(`  ${chalk.gray('Deleted:')}         ${chalk.red(summary.deleted)}`);
  console.log(
    `  ${chalk.gray('Failed:')}          ${summary.failed > 0 ? chalk.red(summary.failed) : chalk.white(summary.failed)}`
  );
  console.log('');
}

/**
 * Run purge for a single system
 */
async function purgeSystem(
  system: ResolvedSystemConfig,
  options: PurgeOptions
): Promise<PurgeResult[]> {
  const downloadDir = path.resolve(system.downloadDir);

  printHeader(downloadDir, options.dryRun);

  // Scan for files
  const files = await scanDownloadDir(downloadDir);

  if (files.length === 0) {
    console.log(chalk.yellow('No files found in directory.'));
    return [];
  }

  console.log(`${chalk.gray('Files found:')} ${chalk.white(files.length)}`);

  // Check for empty blacklist
  if (system.blacklist.length === 0) {
    console.log(chalk.yellow('Blacklist is empty. No files to purge.'));
    return [];
  }

  console.log(`${chalk.gray('Blacklist patterns:')} ${chalk.white(system.blacklist.length)}`);

  // Find blacklisted files
  let blacklistedFiles = findBlacklistedFiles(files, system.blacklist);

  if (blacklistedFiles.length === 0) {
    console.log(chalk.green('No files match the blacklist.'));
    return [];
  }

  // Apply limit if specified
  if (options.limit !== undefined && options.limit > 0 && options.limit < blacklistedFiles.length) {
    console.log(`${chalk.gray('Limiting to:')} ${chalk.white(options.limit)} files`);
    blacklistedFiles = blacklistedFiles.slice(0, options.limit);
  }

  console.log(`${chalk.gray('Matched:')} ${chalk.red(blacklistedFiles.length)} files`);
  console.log('');

  // Dry-run mode: show preview and exit
  if (options.dryRun) {
    return printDryRunPreview(blacklistedFiles);
  }

  // Perform actual deletion
  const results = await deleteFiles(blacklistedFiles);

  // Print summary
  const summary = calculateSummary(files.length, results);
  printSummary(summary);

  return results;
}

/**
 * Run the purge command
 * @param config - Application configuration
 * @param options - Purge options
 * @returns Array of purge results
 */
export async function runPurge(config: Config, options: PurgeOptions): Promise<PurgeResult[]> {
  const allResults: PurgeResult[] = [];

  for (const systemConfig of config.systems) {
    const system = resolveSystemConfig(systemConfig, config);

    // Skip disabled systems
    if (!system.enabled) {
      console.log(chalk.yellow(`  Skipping disabled system: ${system.name}`));
      continue;
    }

    const results = await purgeSystem(system, options);
    allResults.push(...results);
  }

  return allResults;
}
