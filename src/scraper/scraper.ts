import path from 'path';
import type { Config } from '../config/schema.js';
import type {
  RomFile,
  ScrapeResult,
  ScrapeOptions,
} from './types.js';
import { scanForRoms, getImgsDirectory, findExistingImage } from './scanner.js';
import { calculateCRC32 } from './hasher.js';
import { getExtensionsForSystem } from './screenscraper/systems.js';
import { downloadImage } from './downloader.js';
import {
  renderScrapeResult,
  renderScrapeSummary,
  renderDryRunHeader,
  renderDryRunList,
  calculateSummary,
} from './reporter.js';
import { printScraperBanner, printScraperDryRunBanner } from '../ui/index.js';
import chalk from 'chalk';

// Adapter imports
import { adapterRegistry } from './adapters/registry.js';
import type { AdapterSourceConfig, LookupParams } from './adapters/types.js';
import { createLibretroAdapter } from './libretro/adapter.js';
import { createScreenScraperAdapter } from './screenscraper/adapter.js';

// Register adapters
adapterRegistry.register('libretro', createLibretroAdapter);
adapterRegistry.register('screenscraper', createScreenScraperAdapter);

/**
 * Build adapter source configs from the new config schema.
 * Each adapter has its own config section with enabled/priority.
 * Complexity note: Score inflated by defensive null checks (optional chaining)
 * and nullish coalescing for defaults. Logic is a simple linear if-else flow.
 */
// eslint-disable-next-line complexity
function getSourceConfigs(
  config: Config,
  options: ScrapeOptions
): AdapterSourceConfig[] {
  const scraperConfig = config.scraper;
  const sources: AdapterSourceConfig[] = [];

  // CLI source override - use only the specified source
  if (options.source !== undefined && options.source !== '') {
    return [
      {
        id: options.source,
        enabled: true,
        priority: 1,
        options: buildAdapterOptions(options.source, config),
      },
    ];
  }

  // Build from adapter-specific configs
  const libretroConfig = scraperConfig?.libretro;
  const screenscraperConfig = scraperConfig?.screenscraper;

  // Add Libretro if enabled (default: true)
  if (libretroConfig?.enabled !== false) {
    sources.push({
      id: 'libretro',
      enabled: true,
      priority: libretroConfig?.priority ?? 1,
      options: buildAdapterOptions('libretro', config),
    });
  }

  // Add ScreenScraper only if enabled AND credentials are configured
  if (screenscraperConfig?.enabled === true && screenscraperConfig.credentials !== undefined) {
    sources.push({
      id: 'screenscraper',
      enabled: true,
      priority: screenscraperConfig.priority ?? 2,
      options: buildAdapterOptions('screenscraper', config),
    });
  }

  // Sort by priority
  return sources.sort((a, b) => a.priority - b.priority);
}

/**
 * Build adapter-specific options from config
 */
function buildAdapterOptions(
  adapterId: string,
  config: Config
): Record<string, unknown> {
  const scraperConfig = config.scraper;

  if (adapterId === 'screenscraper') {
    const ssConfig = scraperConfig?.screenscraper;
    return {
      credentials: ssConfig?.credentials,
      rateLimitMs: ssConfig?.rateLimitMs ?? 1000,
      userAgent: config.userAgent,
    };
  }

  if (adapterId === 'libretro') {
    return {
      userAgent: config.userAgent,
      timeoutMs: config.requestTimeoutMs,
    };
  }

  return {};
}

/**
 * Check if any enabled source requires hash calculation
 */
function needsHashCalculation(sourceConfigs: AdapterSourceConfig[]): boolean {
  return sourceConfigs.some((s) => {
    const adapter = adapterRegistry.get(s.id, s.options);
    return adapter?.capabilities.hashLookup === true;
  });
}

/**
 * Main scraper orchestrator.
 * Complexity note: Sequential orchestrator with validation, scanning, filtering, processing,
 * and reporting phases. Splitting would fragment a linear workflow into artificial
 * abstractions without improving readability. Adapter pattern adds necessary extensibility.
 */
// eslint-disable-next-line complexity
export async function runScraper(
  config: Config,
  options: ScrapeOptions
): Promise<ScrapeResult[]> {
  // Print banner
  if (options.dryRun) {
    printScraperDryRunBanner();
  } else {
    printScraperBanner();
  }

  const startTime = Date.now();
  const results: ScrapeResult[] = [];

  // Validate system ID
  if (config.scraper?.systemId === undefined || config.scraper.systemId === null) {
    throw new Error(
      'System ID not configured. Add scraper.systemId to your config file.'
    );
  }

  const systemId = config.scraper.systemId;
  const mediaType = options.mediaType ?? config.scraper.mediaType;
  const regionPriority = options.regionPriority ?? config.scraper.regionPriority;
  const skipExisting = !options.force && config.scraper.skipExisting;

  // Build source configurations
  const sourceConfigs = getSourceConfigs(config, options);

  if (sourceConfigs.length === 0) {
    throw new Error(
      'No artwork sources enabled. Enable scraper.libretro or configure scraper.screenscraper with credentials.'
    );
  }

  // Initialize adapters
  const initResults = await adapterRegistry.initializeAll(sourceConfigs);
  const initializedSources = sourceConfigs.filter(
    (s) => initResults.get(s.id) === true
  );

  if (initializedSources.length === 0) {
    throw new Error(
      'No artwork sources could be initialized. Check your configuration.'
    );
  }

  // Log active sources
  const sourceNames = initializedSources.map((s) => s.id).join(', ');
  console.log(chalk.white.bold(`Sources: ${chalk.cyan(sourceNames)}`));

  // Prefetch manifests for adapters that support it (fail fast on errors)
  for (const source of initializedSources) {
    const adapter = adapterRegistry.get(source.id, source.options);
    if (adapter?.prefetch !== undefined) {
      await adapter.prefetch(systemId);
    }
  }

  // Get ROM extensions for this system
  const extensions = getExtensionsForSystem(systemId);

  // Scan for ROMs
  const downloadDir = path.resolve(config.downloadDir);
  const imgsDir = getImgsDirectory(downloadDir);

  console.log(chalk.white.bold(`Directory: ${chalk.cyan(downloadDir)}`));
  const roms = await scanForRoms(downloadDir, extensions);

  if (roms.length === 0) {
    console.log(`  ${chalk.red('✗')} No ROM files found.`);
    return [];
  }

  console.log(`  ${chalk.green('✔')} Found ${chalk.white(roms.length)} ROM files`);

  // Apply limit if specified
  let romsToProcess = roms;
  if (options.limit !== undefined && options.limit > 0 && options.limit < roms.length) {
    romsToProcess = roms.slice(0, options.limit);
    console.log(`  Limited to: ${chalk.yellow(options.limit)} ROMs`);
  }
  console.log('');

  // Check for existing images if skipExisting is enabled
  if (skipExisting) {
    for (const rom of romsToProcess) {
      const existingImage = await findExistingImage(rom.stem, imgsDir);
      if (existingImage !== null) {
        results.push({
          rom,
          status: 'skipped',
          imagePath: existingImage,
        });
      }
    }

    // Filter out ROMs that already have images
    romsToProcess = romsToProcess.filter(
      (rom) => !results.some((r) => r.rom.path === rom.path)
    );
  }

  // Dry-run mode: just show what would be scraped
  if (options.dryRun) {
    // Add remaining ROMs as "would scrape"
    for (const rom of romsToProcess) {
      results.push({
        rom,
        status: 'not_found', // Will be shown as "will scrape" in dry-run
      });
    }

    console.log(renderDryRunHeader(roms.length, romsToProcess.length));
    console.log(renderDryRunList(results));
    return results;
  }

  // Check if we need hash calculation
  const calculateHashes = needsHashCalculation(initializedSources);

  // Process each ROM
  const totalToProcess = romsToProcess.length;
  const alreadySkipped = results.length;

  for (let i = 0; i < romsToProcess.length; i++) {
    const rom = romsToProcess[i]!;
    const result = await processRom(
      rom,
      initializedSources,
      systemId,
      mediaType,
      regionPriority,
      imgsDir,
      config.userAgent,
      calculateHashes
    );

    results.push(result);
    console.log(renderScrapeResult(result, alreadySkipped + i, alreadySkipped + totalToProcess));
  }

  // Print summary
  const elapsedMs = Date.now() - startTime;
  const summary = calculateSummary(results, elapsedMs);
  console.log(renderScrapeSummary(summary, imgsDir));

  return results;
}

/**
 * Process a single ROM: hash (if needed), lookup via adapters, download
 */
async function processRom(
  rom: RomFile,
  sourceConfigs: AdapterSourceConfig[],
  systemId: number,
  mediaType: string,
  regionPriority: string[],
  imgsDir: string,
  userAgent: string,
  calculateHashes: boolean
): Promise<ScrapeResult> {
  try {
    // Calculate CRC32 hash only if needed
    let crc: string | undefined;
    if (calculateHashes) {
      crc = await calculateCRC32(rom.path);
    }

    // Build lookup params
    const lookupParams: LookupParams = {
      rom,
      crc,
      systemId,
      mediaType,
      regionPriority,
    };

    // Try adapters in priority order
    const lookupResult = await adapterRegistry.lookupWithFallback(
      lookupParams,
      sourceConfigs
    );

    if (lookupResult === null || !lookupResult.result.found) {
      return {
        rom,
        status: 'not_found',
        crc,
      };
    }

    const { result, adapterId } = lookupResult;

    if (result.mediaUrl === undefined) {
      return {
        rom,
        status: 'not_found',
        crc,
        gameName: result.gameName,
        source: adapterId,
        error: `No ${mediaType} media available`,
      };
    }

    // Download image
    const downloadResult = await downloadImage({
      url: result.mediaUrl,
      outputDir: imgsDir,
      filename: rom.stem,
      userAgent,
    });

    if (!downloadResult.success) {
      return {
        rom,
        status: 'failed',
        crc,
        gameName: result.gameName,
        source: adapterId,
        error: downloadResult.error,
      };
    }

    return {
      rom,
      status: 'downloaded',
      crc,
      gameName: result.gameName,
      source: adapterId,
      imagePath: downloadResult.path,
      bestEffort: result.bestEffort,
    };
  } catch (err) {
    const error = err as Error;
    return {
      rom,
      status: 'failed',
      error: error.message,
    };
  }
}
