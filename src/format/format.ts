import chalk from 'chalk';
import type { Config, ResolvedSystemConfig } from '../config/index.js';
import { resolveSystemConfig } from '../config/index.js';
import type { FormatResult, FormatSummary, FormatOptions } from './types.js';
import {
  scanForImages,
  getImgsDirectory,
  getOutputDirectory,
  ensureOutputDir,
} from './scanner.js';
import { processImage } from './processor.js';

/**
 * Calculate summary statistics from format results
 */
function calculateSummary(results: FormatResult[], elapsedMs: number): FormatSummary {
  return {
    totalImages: results.length,
    formatted: results.filter((r) => r.status === 'formatted').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
    elapsedMs,
  };
}

/**
 * Render a single format result
 */
function renderResult(result: FormatResult, index: number, total: number): void {
  const prefix = `[${index + 1}/${total}]`;

  if (result.status === 'formatted') {
    console.log(`${prefix} ${chalk.green('FORMATTED')} ${result.image.filename}`);
  } else if (result.status === 'skipped') {
    console.log(`${prefix} ${chalk.yellow('SKIPPED')} ${result.image.filename} (already exists)`);
  } else {
    console.log(
      `${prefix} ${chalk.red('FAILED')} ${result.image.filename}: ${result.error ?? 'Unknown error'}`
    );
  }
}

/**
 * Render format summary
 */
function renderSummary(summary: FormatSummary): void {
  const elapsed = (summary.elapsedMs / 1000).toFixed(1);
  console.log('');
  console.log(chalk.bold('Summary:'));
  console.log(`  Total:     ${summary.totalImages}`);
  console.log(`  Formatted: ${chalk.green(summary.formatted)}`);
  console.log(`  Skipped:   ${chalk.yellow(summary.skipped)}`);
  console.log(`  Failed:    ${chalk.red(summary.failed)}`);
  console.log(`  Time:      ${elapsed}s`);
}

/**
 * Process a single system directory
 */
async function processSystem(
  system: ResolvedSystemConfig,
  options: FormatOptions
): Promise<FormatResult[]> {
  const imgsDir = getImgsDirectory(system.downloadDir);
  const outputDir = getOutputDirectory(imgsDir, options.settings.outputFolder);

  console.log('');
  console.log(chalk.bold.blue(`System: ${system.name}`));
  console.log(`  Source: ${imgsDir}`);
  console.log(`  Output: ${outputDir}`);

  // Scan for images (handle missing Imgs directory gracefully)
  let images;
  try {
    images = await scanForImages(imgsDir);
  } catch (err) {
    const error = err as Error;
    // Check if it's a "not found" error - show as warning and skip
    if (error.message.includes('not found')) {
      console.log(chalk.yellow(`  Skipped: Imgs directory not found`));
      return [];
    }
    // Re-throw other errors
    throw err;
  }

  if (images.length === 0) {
    console.log(chalk.yellow('  Skipped: No images found in Imgs directory'));
    return [];
  }

  // Apply limit if specified
  if (options.limit !== undefined && options.limit < images.length) {
    images = images.slice(0, options.limit);
    console.log(`  Found ${images.length} images (limited)`);
  } else {
    console.log(`  Found ${images.length} images`);
  }

  // Dry run mode
  if (options.dryRun) {
    console.log(chalk.cyan('  Dry run - files that would be processed:'));
    for (const image of images) {
      console.log(`    ${image.filename}`);
    }
    return [];
  }

  // Ensure output directory exists
  await ensureOutputDir(outputDir);

  // Process images
  const results: FormatResult[] = [];
  let index = 0;
  for (const image of images) {
    const result = await processImage(image, options.settings, outputDir, options.force);
    results.push(result);
    renderResult(result, index, images.length);
    index++;
  }

  return results;
}

/**
 * Run the format command
 * @param config - Application configuration
 * @param options - Format options
 * @returns Array of format results
 */
export async function runFormat(config: Config, options: FormatOptions): Promise<FormatResult[]> {
  const { settings } = options;

  console.log(chalk.bold('Formatting artwork'));
  console.log(`  Canvas: ${settings.canvasWidth}x${settings.canvasHeight}`);
  console.log(`  Max size: ${settings.resizeMaxWidth}x${settings.resizeMaxHeight}`);
  console.log(`  Gravity: ${settings.gravity}`);
  console.log(`  Padding: ${settings.padding}px`);
  console.log(`  Output folder: ${settings.outputFolder}`);

  if (options.dryRun) {
    console.log(chalk.cyan('DRY RUN - no files will be modified'));
  }

  const startTime = Date.now();
  const allResults: FormatResult[] = [];

  // Process each system
  for (const systemConfig of config.systems) {
    const system = resolveSystemConfig(systemConfig, config);

    // Skip disabled systems
    if (!system.enabled) {
      console.log(chalk.yellow(`  Skipping disabled system: ${system.name}`));
      continue;
    }

    try {
      const results = await processSystem(system, options);
      allResults.push(...results);
    } catch (err) {
      const error = err as Error;
      console.log(chalk.red(`  Error: ${error.message}`));
    }
  }

  // Show summary (only if not dry run)
  if (!options.dryRun && allResults.length > 0) {
    const summary = calculateSummary(allResults, Date.now() - startTime);
    renderSummary(summary);
  }

  return allResults;
}
