export interface CliArgs {
  dryRun: boolean;
  configPath?: string;
  limit?: number;
}

function isValidArgValue(value: string | undefined): value is string {
  return value !== undefined && !value.startsWith('-');
}

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseArgs(args: string[]): CliArgs {
  const result: CliArgs = { dryRun: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--dry-run' || arg === '-n') {
      result.dryRun = true;
    } else if ((arg === '--config' || arg === '-c') && isValidArgValue(next)) {
      result.configPath = next;
      i++;
    } else if ((arg === '--limit' || arg === '-l') && isValidArgValue(next)) {
      result.limit = parsePositiveInt(next);
      i++;
    }
  }

  return result;
}
