import { resolve } from 'node:path';
import {
  loadConfig,
  resolveSystemConfig,
  type Config,
  type ResolvedSystemConfig,
} from './config/index.js';
import {
  parseArgs,
  getHelpText,
  getUsageText,
  type ScrapeCliArgs,
  type PurgeCliArgs,
  type DedupeCliArgs,
  type HelpCliArgs,
} from './cli/index.js';
import { fetchHtml, isHttpError } from './http/index.js';
import { parseTableLinks, filterZipLinks } from './parser/index.js';
import { applyFilters } from './filter/index.js';
import {
  downloadSequential,
  downloadConcurrent,
  type DownloadResult,
  type DownloadProgress,
} from './downloader/index.js';
import { createRenderer, type Renderer } from './ui/index.js';
import { resolveAndExtract, sanitizeFilename } from './utils/index.js';
import { runScraper } from './scraper/index.js';
import { runPurge } from './purge/index.js';
import { runDedupe } from './dedupe/index.js';
import type { FileEntry, UrlStats } from './types/index.js';

async function processSystem(
  system: ResolvedSystemConfig,
  config: Config,
  renderer: Renderer,
  dryRun: boolean,
  limit?: number
): Promise<UrlStats> {
  const stats: UrlStats = {
    url: system.url,
    totalFound: 0,
    filtered: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    downloadDir: resolve(system.downloadDir),
  };

  renderer.urlStart(system.url);

  // Fetch HTML page
  let html: string;
  let status: number;
  let statusText: string;

  try {
    const result = await fetchHtml(system.url, {
      userAgent: config.userAgent,
      timeoutMs: config.requestTimeoutMs,
      retries: config.retries,
    });
    html = result.html;
    status = result.status;
    statusText = result.statusText;
  } catch (err) {
    const message = isHttpError(err) ? err.message : 'Unknown error';
    renderer.urlError(system.url, message);
    return stats;
  }

  renderer.urlStatus(status, statusText);

  // Parse table
  const parseResult = parseTableLinks(html, system.tableId);
  renderer.tableFound(parseResult.tableFound, system.tableId);

  if (!parseResult.tableFound) {
    return stats;
  }

  // Filter to zip files only
  const zipLinks = filterZipLinks(parseResult.links);
  stats.totalFound = zipLinks.length;

  // Build file entries with resolved URLs (single URL parse per link)
  const fileEntries: FileEntry[] = zipLinks.map((link) => {
    const { url: resolvedUrl, filename: rawFilename } = resolveAndExtract(link.href, system.url);
    return {
      href: link.href,
      url: resolvedUrl,
      filename: sanitizeFilename(rawFilename),
      linkText: link.text,
      expectedSize: link.size,
    };
  });

  // Apply whitelist/blacklist filters
  let filteredEntries = applyFilters(fileEntries, {
    whitelist: system.whitelist,
    blacklist: system.blacklist,
  });
  stats.filtered = filteredEntries.length;

  // Apply limit if specified
  if (limit !== undefined && limit < filteredEntries.length) {
    filteredEntries = filteredEntries.slice(0, limit);
  }

  renderer.fileCounts(stats.totalFound, stats.filtered, limit);

  if (filteredEntries.length === 0) {
    renderer.info('No files to download after filtering.');
    return stats;
  }

  // Dry run mode - just list files
  if (dryRun) {
    renderer.info('Files that would be downloaded:');
    filteredEntries.forEach((entry, index) => {
      renderer.dryRunFile(entry.filename, entry.url, index, filteredEntries.length);
    });
    renderer.finishDryRun();
    return stats;
  }

  // Prepare download list
  const downloadList = filteredEntries.map((entry) => ({
    url: entry.url,
    filename: entry.filename,
    expectedSize: entry.expectedSize,
  }));

  // Initialize scrolling log area before downloads start
  renderer.startDownloads();

  // Download files
  let currentIndex = 0;

  const onProgress = (progress: DownloadProgress): void => {
    renderer.downloadProgress(progress, currentIndex, downloadList.length);
  };

  const onComplete = (result: DownloadResult, index: number, total: number): void => {
    currentIndex = index + 1;
    renderer.downloadComplete(result, index, total);

    if (result.status === 'downloaded') {
      stats.downloaded++;
    } else if (result.status === 'skipped') {
      stats.skipped++;
    } else {
      stats.failed++;
    }
  };

  const downloadOptions = {
    userAgent: config.userAgent,
    timeoutMs: config.requestTimeoutMs,
    retries: config.retries,
    downloadDir: resolve(system.downloadDir),
  };

  if (config.concurrency > 1) {
    await downloadConcurrent(downloadList, downloadOptions, config.concurrency, onComplete);
  } else {
    await downloadSequential(downloadList, downloadOptions, onProgress, onComplete);
  }

  // Finalize scrolling log before summary
  renderer.finishDownloads();

  return stats;
}

async function runDownloadCommand(
  config: Config,
  renderer: Renderer,
  dryRun: boolean,
  limit?: number
): Promise<void> {
  const allStats: UrlStats[] = [];
  let hasFailures = false;

  // Process each system
  for (const systemConfig of config.systems) {
    const system = resolveSystemConfig(systemConfig, config);
    const stats = await processSystem(system, config, renderer, dryRun, limit);
    allStats.push(stats);
    renderer.urlSummary(stats);

    if (stats.failed > 0) {
      hasFailures = true;
    }
  }

  // Print final summary
  if (config.systems.length > 1) {
    renderer.finalSummary(allStats);
  }

  // Exit with appropriate code
  process.exit(hasFailures ? 1 : 0);
}

async function runScrapeCommand(config: Config, cliArgs: ScrapeCliArgs): Promise<void> {
  try {
    const results = await runScraper(config, {
      dryRun: cliArgs.dryRun,
      force: cliArgs.force,
      mediaType: cliArgs.mediaType,
      regionPriority: cliArgs.regionPriority,
      limit: cliArgs.limit,
    });

    // Check for failures
    const hasFailures = results.some((r) => r.status === 'failed');
    process.exit(hasFailures ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Scraper failed');
    process.exit(1);
  }
}

async function runPurgeCommand(config: Config, cliArgs: PurgeCliArgs): Promise<void> {
  try {
    const results = await runPurge(config, {
      dryRun: cliArgs.dryRun,
      limit: cliArgs.limit,
    });

    // Check for failures
    const hasFailures = results.some((r) => r.status === 'failed');
    process.exit(hasFailures ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Purge failed');
    process.exit(1);
  }
}

async function runDedupeCommand(config: Config, cliArgs: DedupeCliArgs): Promise<void> {
  try {
    const results = await runDedupe(config, {
      dryRun: cliArgs.dryRun,
      limit: cliArgs.limit,
    });

    // Check for failures
    const hasFailures = results.some((r) => r.status === 'failed');
    process.exit(hasFailures ? 1 : 0);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Dedupe failed');
    process.exit(1);
  }
}

function runHelpCommand(cliArgs: HelpCliArgs): void {
  console.log(getHelpText(cliArgs.helpCommand));
  process.exit(0);
}

function runNoCommand(): void {
  console.error('Error: No command specified.\n');
  console.error(getUsageText());
  process.exit(1);
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  // Handle help command (no config needed)
  if (cliArgs.command === 'help') {
    runHelpCommand(cliArgs);
    return;
  }

  // Handle no command provided
  if (cliArgs.command === undefined) {
    runNoCommand();
    return;
  }

  // Load configuration
  let config: Config;
  try {
    config = loadConfig(cliArgs.configPath);
  } catch (err) {
    console.error(err instanceof Error ? err.message : 'Failed to load configuration');
    process.exit(1);
  }

  // Dispatch based on command
  if (cliArgs.command === 'scrape') {
    await runScrapeCommand(config, cliArgs);
  } else if (cliArgs.command === 'purge') {
    await runPurgeCommand(config, cliArgs);
  } else if (cliArgs.command === 'dedupe') {
    await runDedupeCommand(config, cliArgs);
  } else {
    const renderer = createRenderer(config.logLevel);
    renderer.banner(cliArgs.dryRun);
    await runDownloadCommand(config, renderer, cliArgs.dryRun, cliArgs.limit);
  }
}

// Run main
main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
