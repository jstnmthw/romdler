# Purge Module

The purge module removes files from your download directory that match your configured blacklist patterns. This is useful for cleaning up unwanted files after an initial download.

## Usage

```bash
# Remove files matching blacklist patterns
pnpm start -- purge

# Preview what would be removed (no deletions)
pnpm start -- purge --dry-run

# Limit to first N deletions
pnpm start -- purge --limit 10
```

## How It Works

1. **Scans** the download directory for all files
2. **Matches** each file against the configured blacklist patterns
3. **Deletes** matching files (or shows preview in dry-run mode)

## Configuration

The purge command uses the `blacklist` array from your `app.config.json`:

```json
{
  "downloadDir": "./downloads/roms/snes",
  "blacklist": [
    "(Japan)",
    "(Europe)",
    "(Beta)",
    "(Proto)",
    "(Virtual Console)"
  ]
}
```

### Filter Syntax

The blacklist supports AND/OR expression syntax:

**OR matching** - multiple terms match if any is found:
```json
{
  "blacklist": ["(Japan)", "(Europe)"]
}
```

**AND matching** - use `AND` to require all words:
```json
{
  "blacklist": ["Rev AND Japan"]
}
```

**Combined** - mix AND expressions with OR logic:
```json
{
  "blacklist": ["(Japan)", "Beta AND Proto"]
}
```

## CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be deleted |
| `--limit <N>` | `-l <N>` | Limit to first N deletions |
| `--config <path>` | `-c <path>` | Use custom config file path |

## Example Output

```
Purge Blacklisted Files
----------------------------------------
Directory: /path/to/downloads/roms/snes
Files found: 150
Blacklist patterns: 5
Matched: 23 files

[1/23] x Game Title (Japan).zip
[2/23] x Another Game (Europe).zip
...

----------------------------------------
Summary
  Scanned:  150
  Matched:  23
  Deleted:  23
```

## Module Structure

```
src/purge/
├── index.ts      # Barrel exports
├── purge.ts      # Main purge logic
├── scanner.ts    # Directory scanning
├── types.ts      # Type definitions
└── README.md     # This file
```

## Types

```typescript
type PurgeFileEntry = {
  path: string;      // Absolute path to file
  filename: string;  // Filename for display/matching
};

type PurgeResult = {
  file: PurgeFileEntry;
  status: 'deleted' | 'skipped' | 'failed';
  error?: string;
};

type PurgeSummary = {
  totalScanned: number;
  matchedBlacklist: number;
  deleted: number;
  failed: number;
};
```

## Exit Codes

- `0` - Success (all matched files deleted)
- `1` - Failure (at least one deletion failed)
