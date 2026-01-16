import path from 'path';
import type { Config } from '../config/schema.js';
import type { RomFile, ScrapeResult, ScrapeOptions, ScreenScraperCredentials } from './types.js';
import { scanForRoms, getImgsDirectory, findExistingImage } from './scanner.js';
import { calculateCRC32 } from './hasher.js';
import { ScreenScraperClient, selectMediaUrl } from './screenscraper/client.js';
import { getExtensionsForSystem } from './screenscraper/systems.js';
import { downloadImage } from './downloader.js';
import {
  renderScrapeResult,
  renderScrapeSummary,
  renderDryRunHeader,
  renderDryRunList,
  calculateSummary,
} from './reporter.js';

/**
 * Main scraper orchestrator
 */
export async function runScraper(
  config: Config,
  options: ScrapeOptions
): Promise<ScrapeResult[]> {
  const startTime = Date.now();
  const results: ScrapeResult[] = [];

  // Validate scraper config
  if (!config.scraper?.credentials) {
    throw new Error(
      'Scraper credentials not configured. Add scraper.credentials to your config file.'
    );
  }

  if (config.scraper.systemId === undefined || config.scraper.systemId === null) {
    throw new Error(
      'System ID not configured. Add scraper.systemId to your config file.'
    );
  }

  const credentials = config.scraper.credentials as ScreenScraperCredentials;
  const systemId = config.scraper.systemId;
  const mediaType = options.mediaType ?? config.scraper.mediaType ?? 'box-2D';
  const regionPriority = options.regionPriority ?? config.scraper.regionPriority ?? ['us', 'wor', 'eu', 'jp'];
  const skipExisting = !options.force && (config.scraper.skipExisting ?? true);
  const rateLimitMs = config.scraper.rateLimitMs ?? 1000;

  // Get ROM extensions for this system
  const extensions = getExtensionsForSystem(systemId);

  // Scan for ROMs
  const downloadDir = path.resolve(config.downloadDir);
  const imgsDir = getImgsDirectory(downloadDir);

  console.log(`\nScanning for ROMs in: ${downloadDir}`);
  const roms = await scanForRoms(downloadDir, extensions);

  if (roms.length === 0) {
    console.log('No ROM files found.');
    return [];
  }

  console.log(`Found ${roms.length} ROM files.`);

  // Apply limit if specified
  let romsToProcess = roms;
  if (options.limit !== undefined && options.limit > 0 && options.limit < roms.length) {
    romsToProcess = roms.slice(0, options.limit);
    console.log(`Processing first ${options.limit} ROMs (--limit).`);
  }

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

  // Create API client
  const client = new ScreenScraperClient(credentials, rateLimitMs, config.userAgent);

  // Process each ROM
  const totalToProcess = romsToProcess.length;
  const alreadySkipped = results.length;

  for (let i = 0; i < romsToProcess.length; i++) {
    const rom = romsToProcess[i]!;
    const result = await processRom(
      rom,
      client,
      systemId,
      mediaType,
      regionPriority,
      imgsDir,
      config.userAgent
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
 * Process a single ROM: hash, lookup, download
 */
async function processRom(
  rom: RomFile,
  client: ScreenScraperClient,
  systemId: number,
  mediaType: string,
  regionPriority: string[],
  imgsDir: string,
  userAgent: string
): Promise<ScrapeResult> {
  try {
    // Calculate CRC32 hash
    const crc = await calculateCRC32(rom.path);

    // Look up game in ScreenScraper
    const gameResult = await client.lookupGame({
      crc,
      systemId,
      romName: rom.filename,
      romSize: rom.size,
    });

    if (!gameResult) {
      return {
        rom,
        status: 'not_found',
        crc,
      };
    }

    // Select media URL
    const mediaUrl = selectMediaUrl(gameResult.medias, mediaType, regionPriority);

    if (mediaUrl === null) {
      return {
        rom,
        status: 'not_found',
        crc,
        gameName: gameResult.gameName,
        error: `No ${mediaType} media available`,
      };
    }

    // Download image
    const downloadResult = await downloadImage({
      url: mediaUrl,
      outputDir: imgsDir,
      filename: rom.stem,
      userAgent,
    });

    if (!downloadResult.success) {
      return {
        rom,
        status: 'failed',
        crc,
        gameName: gameResult.gameName,
        error: downloadResult.error,
      };
    }

    return {
      rom,
      status: 'downloaded',
      crc,
      gameName: gameResult.gameName,
      imagePath: downloadResult.path,
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
