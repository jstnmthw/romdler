/** Command mode for the CLI */
export type Command = 'download' | 'scrape' | 'purge' | 'dedupe' | 'help';

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

/** CLI arguments for purge command */
export interface PurgeCliArgs extends BaseCliArgs {
  command: 'purge';
}

/** CLI arguments for dedupe command */
export interface DedupeCliArgs extends BaseCliArgs {
  command: 'dedupe';
}

/** CLI arguments for help command */
export interface HelpCliArgs {
  command: 'help';
  /** Specific command to show help for (optional) */
  helpCommand?: Command;
}

/** Result when no command was provided (launches TUI) */
export interface NoCommandArgs {
  command: undefined;
  configPath?: string;
}

/** Union type for all CLI args */
export type CliArgs =
  | DownloadCliArgs
  | ScrapeCliArgs
  | PurgeCliArgs
  | DedupeCliArgs
  | HelpCliArgs
  | NoCommandArgs;

function isValidArgValue(value: string | undefined): value is string {
  return value !== undefined && !value.startsWith('-');
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is string => s.length > 0);
}

/** Check if argument is a help flag */
function isHelpFlag(arg: string): boolean {
  return arg === '--help' || arg === '-h';
}

/** Map of valid commands for quick lookup */
const VALID_COMMANDS: Record<string, Command> = {
  download: 'download',
  scrape: 'scrape',
  purge: 'purge',
  dedupe: 'dedupe',
  help: 'help',
};

/**
 * Parse CLI arguments into typed structure.
 * Complexity note: Linear argument parser with fixed flag set. Extracting to a registry
 * pattern would over-engineer a simple CLI with no planned extensibility.
 */
// eslint-disable-next-line complexity
export function parseArgs(args: string[]): CliArgs {
  // Skip leading '--' delimiter (passed through by pnpm/npm)
  let argsToProcess = args;
  if (args[0] === '--') {
    argsToProcess = args.slice(1);
  }

  // Check for --help/-h flag anywhere in args
  if (argsToProcess.some(isHelpFlag)) {
    // Check if there's a command before the help flag
    const firstArg = argsToProcess[0];
    if (
      firstArg !== undefined &&
      firstArg !== '' &&
      !firstArg.startsWith('-') &&
      VALID_COMMANDS[firstArg.toLowerCase()] !== undefined
    ) {
      return {
        command: 'help',
        helpCommand: VALID_COMMANDS[firstArg.toLowerCase()],
      };
    }
    return { command: 'help' };
  }

  // Check if first non-flag argument is a command
  let command: Command | undefined = undefined;
  let startIndex = 0;

  const firstArg = argsToProcess[0];
  if (
    argsToProcess.length > 0 &&
    firstArg !== undefined &&
    firstArg !== '' &&
    !firstArg.startsWith('-')
  ) {
    const possibleCommand = firstArg.toLowerCase();
    const matchedCommand = VALID_COMMANDS[possibleCommand];
    if (matchedCommand !== undefined) {
      command = matchedCommand;
      startIndex = 1;
    }
  }

  // Handle 'help' command (with optional subcommand)
  if (command === 'help') {
    const secondArg = argsToProcess[1];
    if (
      secondArg !== undefined &&
      secondArg !== '' &&
      !secondArg.startsWith('-') &&
      VALID_COMMANDS[secondArg.toLowerCase()] !== undefined
    ) {
      return {
        command: 'help',
        helpCommand: VALID_COMMANDS[secondArg.toLowerCase()],
      };
    }
    return { command: 'help' };
  }

  // No command provided - parse config path and return NoCommandArgs (launches TUI)
  if (command === undefined) {
    let configPath: string | undefined = undefined;
    for (let i = 0; i < argsToProcess.length; i++) {
      const arg = argsToProcess[i];
      const next = argsToProcess[i + 1];
      if ((arg === '--config' || arg === '-c') && isValidArgValue(next)) {
        configPath = next;
        break;
      }
    }
    return { command: undefined, configPath };
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

  for (let i = startIndex; i < argsToProcess.length; i++) {
    const arg = argsToProcess[i];
    const next = argsToProcess[i + 1];

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

  if (command === 'purge') {
    return {
      command: 'purge',
      ...baseArgs,
    };
  }

  if (command === 'dedupe') {
    return {
      command: 'dedupe',
      ...baseArgs,
    };
  }

  return {
    command: 'download',
    ...baseArgs,
  };
}
