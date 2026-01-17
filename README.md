# ROM Downloader

A slim, optimized Node.js micro app for downloading ZIP files from archival website HTML table directories, with integrated artwork scraping from ScreenScraper.

## Features

### Download Features
- Downloads ZIP files from HTML table directory listings
- Streaming downloads to minimize memory usage
- Atomic file writes (download to temp, rename on success)
- Whitelist/blacklist filtering with AND/OR expression support
- Configurable concurrency (default: sequential for polite behavior)
- Retry logic with exponential backoff
- Progress bars and in-place terminal updates
- Dry-run mode to preview downloads
- Skip existing files (with optional size verification)

### Scraper Features (NEW)
- Automatically download cover art for ROMs from ScreenScraper.fr
- CRC32 hash-based ROM identification for accurate matching
- Multiple media types: box art, screenshots, title screens, wheels
- Region priority support (US, World, EU, JP)
- Rate limiting to respect API limits
- Skip existing images option
- Dry-run mode to preview what would be scraped

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

### CLI Options (Download)

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be downloaded without downloading |
| `--limit <N>` | `-l <N>` | Limit downloads to first N files (applied after filtering) |
| `--config <path>` | `-c <path>` | Use custom config file path |

---

## Scraper Command

The `scrape` command downloads cover art for your ROMs from ScreenScraper.fr.

### Basic Scraper Usage

```bash
# Scrape images for all ROMs in downloadDir
pnpm start -- scrape

# Preview what would be scraped (no downloads)
pnpm start -- scrape --dry-run
```

### Scraper Options

```bash
# Limit to first N ROMs
pnpm start -- scrape --limit 10

# Force re-download (overwrite existing images)
pnpm start -- scrape --force

# Specify media type
pnpm start -- scrape --media box-2D    # Box art (default)
pnpm start -- scrape --media ss        # Screenshots
pnpm start -- scrape --media sstitle   # Title screens

# Specify region priority
pnpm start -- scrape --region us,wor,eu,jp
```

### CLI Options (Scrape)

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be scraped |
| `--force` | `-f` | Overwrite existing images |
| `--limit <N>` | `-l <N>` | Limit to first N ROMs |
| `--media <type>` | `-m <type>` | Media type (box-2D, ss, sstitle, etc.) |
| `--region <list>` | `-r <list>` | Region priority (comma-separated) |
| `--config <path>` | `-c <path>` | Use custom config file path |

### Scraper Output

Images are saved to an `Imgs/` subdirectory inside your `downloadDir`:

```
downloads/roms/snes/
├── Super Mario Kart (USA).zip
├── Zelda (USA).zip
└── Imgs/
    ├── Super Mario Kart (USA).png
    └── Zelda (USA).png
```

This follows the standard convention used by Anbernic devices, EmulationStation, and other frontends.

---

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
  "userAgent": "Wget/1.21.2",
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
| `userAgent` | `string` | `"Wget/1.21.2"` | User-Agent header for requests |
| `requestTimeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `2` | Number of retry attempts for failed requests |
| `logLevel` | `string` | `"info"` | Log level: `"debug"`, `"info"`, or `"silent"` |
| `scraper` | `object` | `undefined` | Scraper configuration (see below) |

### Scraper Configuration

To use the scraper, add a `scraper` section to your config:

```json
{
  "urls": ["..."],
  "downloadDir": "./downloads/roms/snes",
  "scraper": {
    "enabled": true,
    "source": "screenscraper",
    "credentials": {
      "devId": "YOUR_DEV_ID",
      "devPassword": "YOUR_DEV_PASSWORD",
      "userId": "YOUR_SCREENSCRAPER_USERNAME",
      "userPassword": "YOUR_SCREENSCRAPER_PASSWORD"
    },
    "systemId": 4,
    "mediaType": "box-2D",
    "regionPriority": ["us", "wor", "eu", "jp"],
    "skipExisting": true,
    "rateLimitMs": 1000
  }
}
```

#### Scraper Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable scraper functionality |
| `source` | `string` | `"screenscraper"` | Data source (only screenscraper supported) |
| `credentials` | `object` | (required) | ScreenScraper API credentials |
| `systemId` | `number` | (required) | ScreenScraper system ID (see table below) |
| `mediaType` | `string` | `"box-2D"` | Media type to download |
| `regionPriority` | `string[]` | `["us","wor","eu","jp"]` | Region preference order |
| `skipExisting` | `boolean` | `true` | Skip ROMs that already have images |
| `rateLimitMs` | `number` | `1000` | Delay between API requests (ms) |

#### System IDs

| System | ID | System | ID |
|--------|-----|--------|-----|
| NES | 3 | SNES | 4 |
| Genesis/Mega Drive | 1 | Master System | 2 |
| Game Boy | 9 | Game Boy Color | 10 |
| Game Boy Advance | 12 | Nintendo 64 | 14 |
| PlayStation | 57 | Dreamcast | 23 |
| Neo Geo | 142 | MAME | 75 |

See `src/scraper/screenscraper/systems.ts` for the full list.

#### Media Types

| Type | Description |
|------|-------------|
| `box-2D` | 2D box art (front cover) |
| `box-3D` | 3D box art render |
| `ss` | In-game screenshot |
| `sstitle` | Title screen |
| `wheel` | Logo/wheel art |
| `mixrbv1` | Mix image v1 (composite) |
| `mixrbv2` | Mix image v2 (composite) |

#### Getting ScreenScraper Credentials

1. Register a free account at [screenscraper.fr](https://www.screenscraper.fr/)
2. Request developer credentials via the ScreenScraper forums
3. Add credentials to your config file

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
│   ├── cli/          # CLI argument parsing
│   ├── config/       # Configuration loading and validation
│   ├── http/         # HTTP fetching with retries
│   ├── parser/       # HTML parsing with Cheerio
│   ├── filter/       # Whitelist/blacklist filtering
│   ├── downloader/   # Streaming download logic
│   ├── scraper/      # ROM artwork scraper
│   │   ├── screenscraper/  # ScreenScraper API client
│   │   ├── hasher.ts       # CRC32 hash calculation
│   │   ├── scanner.ts      # ROM directory scanner
│   │   ├── downloader.ts   # Image downloader
│   │   └── reporter.ts     # Scrape results reporter
│   ├── ui/           # Console rendering
│   ├── utils/        # URL resolution, filename sanitization
│   ├── types/        # Shared TypeScript types
│   └── index.ts      # Main entry point
├── tests/            # Unit tests
├── docs/             # Documentation
│   └── ROM_IMAGE_PAIRING_FEATURE.md  # Scraper design doc
├── app.config.json   # Configuration file
├── app.config.example.json  # Example config with scraper
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
