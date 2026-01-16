# ROM Downloader

A slim, optimized Node.js micro app for downloading ZIP files from archival website HTML table directories.

## Features

- Downloads ZIP files from HTML table directory listings
- Streaming downloads to minimize memory usage
- Atomic file writes (download to temp, rename on success)
- Whitelist/blacklist filtering with AND/OR expression support
- Configurable concurrency (default: sequential for polite behavior)
- Retry logic with exponential backoff
- Progress bars and in-place terminal updates
- Dry-run mode to preview downloads
- Skip existing files (with optional size verification)

## Requirements

- Node.js 20+
- pnpm (recommended) or npm

## Installation

```bash
pnpm install
```

## Usage

### Basic Usage

```bash
pnpm start
```

### Dry Run (Preview Mode)

```bash
pnpm start -- --dry-run
# or
pnpm start -- -n
```

### Limit Downloads

Limit the number of files to download (useful for testing):

```bash
# Download only the first 5 files
pnpm start -- --limit 5
# or
pnpm start -- -l 5

# Combine with dry-run to preview first N files
pnpm start -- --dry-run --limit 10
```

### Custom Config Path

```bash
pnpm start -- --config ./my-config.json
# or
pnpm start -- -c ./my-config.json
```

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be downloaded without downloading |
| `--limit <N>` | `-l <N>` | Limit downloads to first N files (applied after filtering) |
| `--config <path>` | `-c <path>` | Use custom config file path |

## Configuration

Create an `app.config.json` file in the project root:

```json
{
  "urls": [
    "https://example.com/archive/roms/"
  ],
  "tableId": "list",
  "downloadDir": "./downloads",
  "whitelist": [],
  "blacklist": [],
  "concurrency": 1,
  "userAgent": "ROM-Downloader/1.0 (Archival Tool)",
  "requestTimeoutMs": 30000,
  "retries": 2,
  "logLevel": "info"
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `urls` | `string[]` | (required) | List of archive directory URLs to process |
| `tableId` | `string` | (required) | HTML table ID containing the file list |
| `downloadDir` | `string` | (required) | Directory to save downloaded files |
| `whitelist` | `string[]` | `[]` | Only download files matching these terms |
| `blacklist` | `string[]` | `[]` | Exclude files matching these terms |
| `concurrency` | `number` | `1` | Number of concurrent downloads (1-10) |
| `userAgent` | `string` | `"ROM-Downloader/1.0"` | User-Agent header for requests |
| `requestTimeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `2` | Number of retry attempts for failed requests |
| `logLevel` | `string` | `"info"` | Log level: `"debug"`, `"info"`, or `"silent"` |

### Filtering

The whitelist and blacklist support an AND/OR expression syntax:

```json
{
  "whitelist": ["mario", "zelda"]
}
```
This matches files containing "mario" OR "zelda".

```json
{
  "whitelist": ["super AND mario"]
}
```
This matches files containing BOTH "super" AND "mario".

```json
{
  "whitelist": ["super AND mario", "zelda"]
}
```
This matches files containing ("super" AND "mario") OR "zelda".

**Match targets:** Filtering matches against both the filename and the link text.

**Blacklist precedence:** Blacklist always takes precedence over whitelist.

## Console Output

The app provides modern, colored console output:

```
╔════════════════════════════════════════════════════════╗
║  ROM Downloader v1.0.0                                 ║
║  Archive ZIP file bulk downloader                      ║
╚════════════════════════════════════════════════════════╝

URL: https://example.com/archive/roms/
  Status: 200 (OK)
  ✔ Table "list" found
  Files found: 500
  After filtering: 123/500
  Limited to: 10 files

✔ mario.zip downloaded [  1/123]
✔ zelda.zip downloaded [  2/123]
↷ sonic.zip skipped [  3/123]
...

──────────────────────────────────────────────────────────
Summary
──────────────────────────────────────────────────────────
  Total found:     500
  Filtered:        123
  Downloaded:      100
  Skipped:         20
  Failed:          3

  Destination:     /home/user/downloads
```

## Development

### Available Scripts

```bash
pnpm start      # Run the application
pnpm typecheck  # Type check without emitting
pnpm lint       # Run ESLint
pnpm lint:fix   # Run ESLint with auto-fix
pnpm test       # Run tests
pnpm test:watch # Run tests in watch mode
pnpm build      # Build TypeScript to dist/
```

### Project Structure

```
rom-downloader/
├── src/
│   ├── config/       # Configuration loading and validation
│   ├── http/         # HTTP fetching with retries
│   ├── parser/       # HTML parsing with Cheerio
│   ├── filter/       # Whitelist/blacklist filtering
│   ├── downloader/   # Streaming download logic
│   ├── ui/           # Console rendering
│   ├── utils/        # URL resolution, filename sanitization
│   ├── types/        # Shared TypeScript types
│   └── index.ts      # Main entry point
├── tests/            # Unit tests
├── app.config.json   # Configuration file
├── ARCHITECTURE.md   # Design documentation
└── README.md         # This file
```

## Exit Codes

- `0` - Success (all files downloaded or skipped)
- `1` - Failure (at least one URL failed completely or downloads failed)

## Security

- **Path traversal prevention**: Filenames are sanitized to prevent writing outside the download directory
- **URL validation**: Only HTTP/HTTPS URLs are accepted
- **Safe filenames**: Dangerous characters are removed or replaced
- **Atomic writes**: Downloads use temp files to prevent partial files

## License

MIT
