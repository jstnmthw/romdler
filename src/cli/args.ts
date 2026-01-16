/** Command mode for the CLI */
export type Command = 'download' | 'scrape';

/** Base CLI arguments shared by all commands */
export interface BaseCliArgs {
  command: Command;
  dryRun: boolean;
  configPath?: string;
  limit?: number;
}

/** CLI arguments for download command */
export interface DownloadCliArgs extends BaseCliArgs {
  command: 'download';
}

/** CLI arguments for scrape command */
export interface ScrapeCliArgs extends BaseCliArgs {
  command: 'scrape';
  force: boolean;
  mediaType?: string;
  regionPriority?: string[];
}

/** Union type for all CLI args */
export type CliArgs = DownloadCliArgs | ScrapeCliArgs;

function isValidArgValue(value: string | undefined): value is string {
  return value !== undefined && !value.startsWith('-');
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCommaSeparated(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter((s): s is string => s.length > 0);
}

export function parseArgs(args: string[]): CliArgs {
  // Check if first non-flag argument is a command
  let command: Command = 'download';
  let startIndex = 0;

  const firstArg = args[0];
  if (args.length > 0 && firstArg !== undefined && firstArg !== '' && !firstArg.startsWith('-')) {
    const possibleCommand = firstArg.toLowerCase();
    if (possibleCommand === 'scrape') {
      command = 'scrape';
      startIndex = 1;
    } else if (possibleCommand === 'download') {
      command = 'download';
      startIndex = 1;
    }
  }

  // Parse common arguments
  const baseArgs = {
    dryRun: false,
    configPath: undefined as string | undefined,
    limit: undefined as number | undefined,
  };

  // Scrape-specific arguments
  const scrapeArgs = {
    force: false,
    mediaType: undefined as string | undefined,
    regionPriority: undefined as string[] | undefined,
  };

  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    // Common arguments
    if (arg === '--dry-run' || arg === '-n') {
      baseArgs.dryRun = true;
    } else if ((arg === '--config' || arg === '-c') && isValidArgValue(next)) {
      baseArgs.configPath = next;
      i++;
    } else if ((arg === '--limit' || arg === '-l') && isValidArgValue(next)) {
      baseArgs.limit = parsePositiveInt(next);
      i++;
    }
    // Scrape-specific arguments
    else if (arg === '--force' || arg === '-f') {
      scrapeArgs.force = true;
    } else if ((arg === '--media' || arg === '-m') && isValidArgValue(next)) {
      scrapeArgs.mediaType = next;
      i++;
    } else if ((arg === '--region' || arg === '-r') && isValidArgValue(next)) {
      scrapeArgs.regionPriority = parseCommaSeparated(next);
      i++;
    }
  }

  if (command === 'scrape') {
    return {
      command: 'scrape',
      ...baseArgs,
      ...scrapeArgs,
    };
  }

  return {
    command: 'download',
    ...baseArgs,
  };
}
