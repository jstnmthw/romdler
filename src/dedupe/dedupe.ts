import path from 'path';
import { readdir } from 'fs/promises';
import chalk from 'chalk';
import type { Config } from '../config/index.js';
import { atomicMove, ensureDir } from '../utils/index.js';
import type { DedupeRomFile, DedupeResult, DedupeSummary, RomGroup } from './types.js';
import { parseRomFilename } from './parser.js';
import { groupRomsBySignature, analyzeGroup, getGroupsWithDuplicates } from './grouper.js';

export type DedupeOptions = {
  dryRun: boolean;
  limit?: number;
};

/**
 * Scan download directory for ROM files
 * @param directory - Directory to scan
 * @returns Array of dedupe ROM file entries
 */
async function scanDirectory(directory: string): Promise<DedupeRomFile[]> {
  const files: DedupeRomFile[] = [];
  const absoluteDir = path.resolve(directory);

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and directories starting with special chars
      if (entry.name.startsWith('.') || entry.name.startsWith('-')) {
        continue;
      }
      // Skip Imgs directory
      if (entry.name.toLowerCase() === 'imgs') {
        continue;
      }
      // Only process files
      if (!entry.isFile()) {
        continue;
      }

      const parsed = parseRomFilename(entry.name);
      files.push({
        path: path.join(absoluteDir, entry.name),
        filename: entry.name,
        parsed,
      });
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Directory not found: ${directory}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${directory}`);
    }
    throw new Error(`Failed to scan directory: ${error.message}`);
  }

  // Sort by filename for consistent ordering
  files.sort((a, b) => a.filename.localeCompare(b.filename));

  return files;
}

/**
 * Move a single file to the deleted folder
 * @param file - File to move
 * @param deletedDir - Path to the deleted folder
 */
async function moveToDeleted(file: DedupeRomFile, deletedDir: string): Promise<DedupeResult> {
  try {
    const destPath = path.join(deletedDir, file.filename);
    await atomicMove(file.path, destPath);
    return {
      file,
      status: 'removed',
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
 * Print header for dedupe operation
 */
function printHeader(downloadDir: string, deletedDir: string, dryRun: boolean): void {
  console.log('');
  console.log(chalk.cyan.bold('Dedupe ROM Files'));
  console.log(chalk.gray('\u2500'.repeat(40)));

  if (dryRun) {
    console.log(chalk.yellow.bold('[DRY RUN] No files will be moved'));
    console.log('');
  }

  console.log(`${chalk.gray('Directory:')} ${chalk.white(downloadDir)}`);
  console.log(`${chalk.gray('Deleted folder:')} ${chalk.white(deletedDir)}`);
}

/**
 * Print group details showing what will be kept/removed
 */
function printGroupDetails(groups: RomGroup[]): void {
  console.log('');

  for (const group of groups) {
    console.log(chalk.white.bold(group.displayTitle));

    // Show kept files
    for (const file of group.toKeep) {
      const isPreferred = file === group.preferred;
      const suffix = isPreferred ? chalk.gray(' (preferred)') : '';
      console.log(`  ${chalk.green('\u2713')} ${file.filename}${suffix}`);
    }

    // Show files to remove
    for (const file of group.toRemove) {
      console.log(`  ${chalk.red('x')} ${file.filename}`);
    }

    console.log('');
  }
}

/**
 * Print dry-run preview
 */
function printDryRunPreview(groups: RomGroup[]): DedupeResult[] {
  printGroupDetails(groups);

  // Collect all files that would be removed
  const results: DedupeResult[] = [];
  for (const group of groups) {
    for (const file of group.toRemove) {
      results.push({
        file,
        status: 'kept', // Not actually removed in dry-run
      });
    }
  }

  return results;
}

/**
 * Move duplicate files to deleted folder
 */
async function moveFiles(groups: RomGroup[], deletedDir: string): Promise<DedupeResult[]> {
  const results: DedupeResult[] = [];

  // Ensure deleted directory exists
  await ensureDir(deletedDir);

  // Collect all files to remove
  const filesToRemove: DedupeRomFile[] = [];
  for (const group of groups) {
    for (const file of group.toRemove) {
      filesToRemove.push(file);
    }
  }

  const total = filesToRemove.length;

  for (let i = 0; i < filesToRemove.length; i++) {
    const file = filesToRemove[i];
    if (file === undefined) {
      continue;
    }

    const result = await moveToDeleted(file, deletedDir);
    results.push(result);

    const prefix = chalk.gray(`[${String(i + 1).padStart(String(total).length)}/${total}]`);
    if (result.status === 'removed') {
      console.log(`${prefix} ${chalk.yellow('\u2192')} ${result.file.filename}`);
    } else {
      console.log(
        `${prefix} ${chalk.red('!')} ${result.file.filename} ${chalk.red(`(${result.error ?? 'unknown error'})`)}`
      );
    }
  }

  return results;
}

/**
 * Calculate summary from dedupe results
 */
function calculateSummary(
  totalScanned: number,
  groupsWithDuplicates: number,
  results: DedupeResult[],
  keptCount: number
): DedupeSummary {
  return {
    totalScanned,
    groupsWithDuplicates,
    removed: results.filter((r) => r.status === 'removed').length,
    kept: keptCount,
    failed: results.filter((r) => r.status === 'failed').length,
  };
}

/**
 * Print dedupe summary
 */
function printSummary(summary: DedupeSummary): void {
  console.log('');
  console.log(chalk.gray('\u2500'.repeat(40)));
  console.log(chalk.white.bold('Summary'));
  console.log(`  ${chalk.gray('Scanned:')} ${chalk.white(summary.totalScanned)}`);
  console.log(
    `  ${chalk.gray('Groups with duplicates:')} ${chalk.white(summary.groupsWithDuplicates)}`
  );
  console.log(`  ${chalk.gray('Moved:')}   ${chalk.yellow(summary.removed)}`);
  console.log(`  ${chalk.gray('Kept:')}    ${chalk.green(summary.kept)}`);
  if (summary.failed > 0) {
    console.log(`  ${chalk.gray('Failed:')}  ${chalk.red(summary.failed)}`);
  }
  console.log('');
}

/**
 * Count total files to remove across all groups
 */
function countFilesToRemove(groups: RomGroup[]): number {
  let total = 0;
  for (const group of groups) {
    total += group.toRemove.length;
  }
  return total;
}

/**
 * Count total files to keep across all groups
 */
function countFilesToKeep(groups: RomGroup[]): number {
  let total = 0;
  for (const group of groups) {
    total += group.toKeep.length;
  }
  return total;
}

/**
 * Apply limit to groups, returning groups with limited toRemove lists
 */
function applyLimit(groups: RomGroup[], limit: number): RomGroup[] {
  let remaining = limit;
  const limitedGroups: RomGroup[] = [];

  for (const group of groups) {
    if (remaining <= 0) {
      break;
    }

    const limitedToRemove = group.toRemove.slice(0, remaining);
    remaining -= limitedToRemove.length;

    if (limitedToRemove.length > 0) {
      limitedGroups.push({
        ...group,
        toRemove: limitedToRemove,
      });
    }
  }

  return limitedGroups;
}

/**
 * Run the dedupe command
 * @param config - Application configuration
 * @param options - Dedupe options
 * @returns Array of dedupe results
 */
export async function runDedupe(config: Config, options: DedupeOptions): Promise<DedupeResult[]> {
  const downloadDir = path.resolve(config.downloadDir);
  const deletedDir = path.join(downloadDir, 'deleted');

  printHeader(downloadDir, deletedDir, options.dryRun);

  // Scan for files
  const files = await scanDirectory(downloadDir);

  if (files.length === 0) {
    console.log(chalk.yellow('No files found in directory.'));
    return [];
  }

  console.log(`${chalk.gray('Files found:')} ${chalk.white(files.length)}`);

  // Group files by signature
  const groupedMap = groupRomsBySignature(files);

  // Analyze each group with user preferences
  const preferences = config.dedupe;
  const analyzedGroups: RomGroup[] = [];
  for (const [signature, groupFiles] of groupedMap) {
    analyzedGroups.push(analyzeGroup(signature, groupFiles, preferences));
  }

  // Get groups with duplicates to remove
  let duplicateGroups = getGroupsWithDuplicates(analyzedGroups);

  if (duplicateGroups.length === 0) {
    console.log(chalk.green('No duplicates found.'));
    return [];
  }

  console.log(`${chalk.gray('Groups with duplicates:')} ${chalk.white(duplicateGroups.length)}`);

  // Count total files to remove before limit
  const totalToRemove = countFilesToRemove(duplicateGroups);

  // Apply limit if specified
  if (options.limit !== undefined && options.limit > 0 && options.limit < totalToRemove) {
    console.log(`${chalk.gray('Limiting to:')} ${chalk.white(options.limit)} removals`);
    duplicateGroups = applyLimit(duplicateGroups, options.limit);
  }

  // Count total files to keep
  const keptCount = countFilesToKeep(duplicateGroups);

  // Dry-run mode: show preview and exit
  if (options.dryRun) {
    const results = printDryRunPreview(duplicateGroups);
    const summary = calculateSummary(
      files.length,
      duplicateGroups.length,
      [],
      keptCount + results.length // In dry-run, nothing is removed
    );
    printSummary(summary);
    return results;
  }

  // Show group details before moving
  printGroupDetails(duplicateGroups);

  // Move files to deleted folder
  const results = await moveFiles(duplicateGroups, deletedDir);

  // Print summary
  const summary = calculateSummary(files.length, duplicateGroups.length, results, keptCount);
  printSummary(summary);

  return results;
}
