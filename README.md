# Romdler

A Node.js CLI for downloading ZIP archives from directory listings and fetching box art for use with gaming frontends.

> **Disclaimer:** This software is intended for use only when you have explicit authorization from the owner of the server or service to access and download content. Users are solely responsible for ensuring their use complies with applicable laws and terms of service. The authors are not liable for any misuse of this software.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Artwork Command](#artwork-command)
- [Configuration](#configuration)
  - [Configuration Options](#configuration-options)
  - [Artwork Configuration](#artwork-configuration)
  - [Filtering](#filtering)
- [Development](#development)
- [Exit Codes](#exit-codes)
- [Security](#security)
- [License](#license)

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

### Artwork Features
- Download cover art from multiple sources with fallback support
- Libretro Thumbnails: fast, no authentication required
- ScreenScraper.fr: CRC32 hash-based matching for accuracy
- Multiple media types: box art, screenshots, title screens, wheels
- Region priority support (US, World, EU, JP)
- Rate limiting to respect API limits
- Skip existing images option
- Dry-run mode to preview downloads

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

## Artwork Command

The `scrape` command downloads cover art for your files using multiple sources.

### Basic Usage

```bash
# Scrape images for all ROMs in downloadDir
pnpm start -- scrape

# Preview what would be scraped (no downloads)
pnpm start -- scrape --dry-run
```

### Artwork Options

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

### CLI Options (Artwork)

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be scraped |
| `--force` | `-f` | Overwrite existing images |
| `--limit <N>` | `-l <N>` | Limit to first N ROMs |
| `--media <type>` | `-m <type>` | Media type (box-2D, ss, sstitle, etc.) |
| `--region <list>` | `-r <list>` | Region priority (comma-separated) |
| `--config <path>` | `-c <path>` | Use custom config file path |

### Artwork Output

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

### Artwork Configuration

The artwork downloader supports multiple sources with fallback. Libretro is enabled by default (no auth required). ScreenScraper can be enabled for better accuracy when Libretro doesn't find a match.

For detailed configuration documentation, see [src/scraper/README.md](src/scraper/README.md).

#### Minimal Configuration (Libretro Only)

```json
{
  "scraper": {
    "enabled": true,
    "systemId": 4
  }
}
```

#### With ScreenScraper Fallback

```json
{
  "scraper": {
    "enabled": true,
    "systemId": 4,
    "screenscraper": {
      "enabled": true,
      "credentials": {
        "devId": "YOUR_DEV_ID",
        "devPassword": "YOUR_DEV_PASSWORD",
        "userId": "YOUR_USERNAME",
        "userPassword": "YOUR_PASSWORD"
      }
    }
  }
}
```

#### Common Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable artwork downloading |
| `systemId` | `number` | (required) | System ID for platform identification |
| `mediaType` | `string` | `"box-2D"` | Media type to download |
| `regionPriority` | `string[]` | `["us","wor","eu","jp"]` | Region preference order |
| `skipExisting` | `boolean` | `true` | Skip files that already have images |
| `resize` | `object` | - | Image resize options |
| `libretro` | `object` | - | Libretro adapter config |
| `screenscraper` | `object` | - | ScreenScraper adapter config |

#### System IDs

| System | ID | System | ID |
|--------|-----|--------|-----|
| NES | 3 | SNES | 4 |
| Genesis/Mega Drive | 1 | Master System | 2 |
| Game Boy | 9 | Game Boy Color | 10 |
| Game Boy Advance | 12 | Nintendo 64 | 14 |
| PlayStation | 57 | Dreamcast | 23 |
| Neo Geo | 142 | MAME | 75 |

See [src/scraper/README.md](src/scraper/README.md) for the full list and detailed adapter configuration

### Filtering

The whitelist and blacklist support an AND/OR expression syntax:

**OR matching** - multiple terms in the array match if any term is found:
```json
{
  "whitelist": ["mario", "zelda"]
}
```

**AND matching** - use `AND` within a term to require all words:
```json
{
  "whitelist": ["super AND mario"]
}
```

**Combined** - mix AND expressions with OR logic:
```json
{
  "whitelist": ["super AND mario", "zelda"]
}
```
This matches ("super" AND "mario") OR "zelda".

**Match targets:** Filtering matches against both the filename and the link text.

**Blacklist precedence:** Blacklist always takes precedence over whitelist.

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
romdler/
├── src/
│   ├── cli/          # CLI argument parsing
│   ├── config/       # Configuration loading and validation
│   ├── http/         # HTTP fetching with retries
│   ├── parser/       # HTML parsing with Cheerio
│   ├── filter/       # Whitelist/blacklist filtering
│   ├── downloader/   # Streaming download logic
│   ├── scraper/      # Artwork downloader
│   │   ├── adapters/      # Adapter interface & registry
│   │   ├── libretro/      # Libretro Thumbnails adapter
│   │   ├── screenscraper/ # ScreenScraper API adapter
│   │   ├── hasher.ts      # CRC32 hash calculation
│   │   ├── scanner.ts     # Directory scanner
│   │   ├── downloader.ts  # Image downloader
│   │   └── reporter.ts    # Scrape results reporter
│   ├── ui/           # Console rendering
│   ├── utils/        # URL resolution, filename sanitization
│   ├── types/        # Shared TypeScript types
│   └── index.ts      # Main entry point
├── tests/            # Unit tests
├── docs/             # Documentation
├── app.config.json   # Configuration file
├── app.config.example.json  # Example config
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

[MIT](LICENSE.md)
