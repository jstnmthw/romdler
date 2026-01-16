import { resolve } from 'node:path';
import { loadConfig, type Config } from './config/index.js';
import { parseArgs } from './cli/index.js';
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
import type { FileEntry, UrlStats } from './types/index.js';

async function processUrl(
  url: string,
  config: Config,
  renderer: Renderer,
  dryRun: boolean,
  limit?: number
): Promise<UrlStats> {
  const stats: UrlStats = {
    url,
    totalFound: 0,
    filtered: 0,
    downloaded: 0,
    skipped: 0,
    failed: 0,
    downloadDir: resolve(config.downloadDir),
  };

  renderer.urlStart(url);

  // Fetch HTML page
  let html: string;
  let status: number;
  let statusText: string;

  try {
    const result = await fetchHtml(url, {
      userAgent: config.userAgent,
      timeoutMs: config.requestTimeoutMs,
      retries: config.retries,
    });
    html = result.html;
    status = result.status;
    statusText = result.statusText;
  } catch (err) {
    const message = isHttpError(err) ? err.message : 'Unknown error';
    renderer.urlError(url, message);
    return stats;
  }

  renderer.urlStatus(status, statusText);

  // Parse table
  const parseResult = parseTableLinks(html, config.tableId);
  renderer.tableFound(parseResult.tableFound, config.tableId);

  if (!parseResult.tableFound) {
    return stats;
  }

  // Filter to zip files only
  const zipLinks = filterZipLinks(parseResult.links);
  stats.totalFound = zipLinks.length;

  // Build file entries with resolved URLs (single URL parse per link)
  const fileEntries: FileEntry[] = zipLinks.map((link) => {
    const { url: resolvedUrl, filename: rawFilename } = resolveAndExtract(link.href, url);
    return {
      href: link.href,
      url: resolvedUrl,
      filename: sanitizeFilename(rawFilename),
      linkText: link.text,
    };
  });

  // Apply whitelist/blacklist filters
  let filteredEntries = applyFilters(fileEntries, {
    whitelist: config.whitelist,
    blacklist: config.blacklist,
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
    return stats;
  }

  // Prepare download list
  const downloadList = filteredEntries.map((entry) => ({
    url: entry.url,
    filename: entry.filename,
  }));

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
    downloadDir: resolve(config.downloadDir),
  };

  if (config.concurrency > 1) {
    await downloadConcurrent(
      downloadList,
      downloadOptions,
      config.concurrency,
      onComplete
    );
  } else {
    await downloadSequential(downloadList, downloadOptions, onProgress, onComplete);
  }

  return stats;
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  // Load configuration
  let config: Config;
  try {
    config = loadConfig(cliArgs.configPath);
  } catch (err) {
    console.error(
      err instanceof Error ? err.message : 'Failed to load configuration'
    );
    process.exit(1);
  }

  const renderer = createRenderer(config.logLevel);
  renderer.banner(cliArgs.dryRun);

  const allStats: UrlStats[] = [];
  let hasFailures = false;

  // Process each URL
  for (const url of config.urls) {
    const stats = await processUrl(url, config, renderer, cliArgs.dryRun, cliArgs.limit);
    allStats.push(stats);
    renderer.urlSummary(stats);

    if (stats.failed > 0) {
      hasFailures = true;
    }
  }

  // Print final summary
  if (config.urls.length > 1) {
    renderer.finalSummary(allStats);
  }

  // Exit with appropriate code
  process.exit(hasFailures ? 1 : 0);
}

// Run main
main().catch((err: unknown) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
