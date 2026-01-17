# Romdler

![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/jstnmthw/23dc7a3936b93f223a1ad4f51e3a0879/raw/romdler-coverage.json)

Turn scattered ROM downloads into a clean, deduplicated, artwork-ready game library — automatically. A Node.js CLI for downloading, organizing, scraping artwork and deduplicating ROM collections.

> **Disclaimer:** This software is intended for use only when you have explicit authorization from the owner of the server or service to access and download content. Users are solely responsible for ensuring their use complies with applicable laws and terms of service. The authors are not liable for any misuse of this software.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Artwork Command](#artwork-command)
- [Purge Command](#purge-command)
- [Dedupe Command](#dedupe-command)
- [Configuration](#configuration)
  - [Configuration Options](#configuration-options)
  - [Scraper Configuration](#artwork-configuration)
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
- **Best-effort matching**: fuzzy lookup for Proto, Beta, Unlicensed variants
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

## Purge Command

The `purge` command removes files from your download directory that match your blacklist patterns. This is useful for cleaning up unwanted files after an initial download.

For detailed documentation, see [src/purge/README.md](src/purge/README.md).

### Basic Usage

```bash
# Remove files matching blacklist patterns
pnpm start -- purge

# Preview what would be removed (no deletions)
pnpm start -- purge --dry-run
```

### Purge Options

```bash
# Limit to first N deletions
pnpm start -- purge --limit 10

# Combine with dry-run to preview
pnpm start -- purge --dry-run --limit 5
```

### CLI Options (Purge)

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be deleted |
| `--limit <N>` | `-l <N>` | Limit to first N deletions |
| `--config <path>` | `-c <path>` | Use custom config file path |

---

## Dedupe Command

The `dedupe` command identifies and removes duplicate ROM files using preference-based selection. It groups files by title, then picks the best version from each group based on configurable preferences. Removed files are moved to a `deleted/` subfolder for safe recovery.

For detailed documentation, see [src/dedupe/README.md](src/dedupe/README.md).

### Basic Usage

```bash
# Analyze and move duplicates to deleted/ folder
pnpm start -- dedupe

# Preview what would be moved (no changes)
pnpm start -- dedupe --dry-run
```

### How It Works

1. **Parses filenames** to extract title, regions, and tokens
2. **Groups files by title** (aggressive grouping ignores region/modifier differences)
3. **Applies preference rules** to pick the best file from each group:
   - Fewer "avoid" tokens = better (Beta, Proto, Retro-Bit, etc.)
   - Better region priority = better (USA > World > Europe > Japan by default)
   - Shorter filename = better (tiebreaker)
4. **Moves non-preferred files** to `deleted/` folder

### Preference-Based Selection

Unlike simple clean/variant detection, dedupe uses configurable preferences to **always pick exactly one file** per group, even when all versions are variants.

**Selection priority:**
1. **Avoid tokens** - Files containing fewer "avoid" terms win
2. **Region priority** - Files with higher-priority regions win
3. **Tiebreaker** - Shorter filenames win (fewer modifiers = cleaner)

### Configuration

Dedupe uses sensible defaults out of the box. You only need to configure it if you want to customize the behavior.

**Default behavior (no config needed):**
- Region priority: USA > World > Europe > Japan
- Avoids: Proto, Beta, Demo, Virtual Console, Retro-Bit, etc.
- Tiebreaker: shortest filename wins

**To customize**, add a `dedupe` section to `defaults` or per-system:

```json
{
  "downloadDir": "./downloads/roms",
  "defaults": {
    "dedupe": {
      "regions": ["Japan", "USA", "Europe"],
      "tiebreaker": "alphabetical"
    }
  },
  "systems": [
    {
      "system": "snes",
      "url": "https://example.com/roms/snes",
      "folder": "SNES"
    }
  ]
}
```

This example changes the region priority to prefer Japan releases and uses alphabetical tiebreaker.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `regions` | `string[]` | `["USA", "World", "Europe", "Japan"]` | Region preference order (first = most preferred) |
| `avoid` | `string[]` | (see defaults) | Tokens to avoid - files containing these are less preferred |
| `tiebreaker` | `string` | `"shortest"` | How to break ties: `"shortest"` or `"alphabetical"` |

### Default Avoid List

Development versions, unofficial releases, re-release platforms, and compilations:
- `Proto`, `Beta`, `Sample`, `Demo`, `Preview`, `Promo`, `Rev`, `Alt`
- `Unl`, `Pirate`, `Aftermarket`
- `Virtual Console`, `Retro-Bit`, `Pixel Heart`, `RetroZone`, `Switch Online`
- `GameCube`, `Wii U`, `3DS`, `NSO`, `e-Reader`, `iam8bit`, `Limited Run`
- `Genesis Mini`, `SNES Classic`, `NES Classic`, `Mini Console`
- `Capcom Classics`, `Namco Museum`, `Mega Man Legacy`, etc.

### Multi-Region Support

Dedupe correctly parses multi-region tokens like `(USA, Europe)` into separate regions, ensuring proper grouping and region priority matching.

### Example

**Input files:**
```
8 Eyes (USA).zip                           <- KEEP (preferred)
8 Eyes (USA, Europe) (Pixel Heart).zip     <- MOVE (Pixel Heart in avoid list)
Airball (USA) (Proto 1) (Unl).zip          <- KEEP (best of variants)
Airball (USA) (Proto 2) (Unl).zip          <- MOVE
Airball (USA) (Proto 3) (Unl).zip          <- MOVE
Airball (USA) (RetroZone) (Pirate).zip     <- MOVE
```

**Output structure:**
```
downloads/roms/nes/
├── 8 Eyes (USA).zip
├── Airball (USA) (Proto 1) (Unl).zip
└── deleted/
    ├── 8 Eyes (USA, Europe) (Pixel Heart).zip
    ├── Airball (USA) (Proto 2) (Unl).zip
    ├── Airball (USA) (Proto 3) (Unl).zip
    └── Airball (USA) (RetroZone) (Pirate).zip
```

### CLI Options (Dedupe)

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be moved |
| `--limit <N>` | `-l <N>` | Limit to first N moves |
| `--config <path>` | `-c <path>` | Use custom config file path |

---

## Configuration

Create an `app.config.json` file in the project root:

```json
{
  "downloadDir": "./downloads/roms",
  "defaults": {
    "whitelist": ["USA"]
  },
  "systems": [
    {
      "system": "gbc",
      "url": "https://example.com/roms/gbc",
      "folder": "GBC"
    },
    {
      "system": "snes",
      "url": "https://example.com/roms/snes",
      "folder": "SNES",
      "whitelist": ["USA", "World"]
    }
  ]
}
```

That's it. Everything else uses sensible defaults (Libretro scraping, dedupe logic, concurrency, etc.).

### Configuration Structure

The config is organized into three main sections:

1. **`downloadDir`** - Parent directory for all ROM folders
2. **`defaults`** - Default settings that apply to all systems (can be overridden per-system)
3. **`systems`** - Array of system configurations, each with its own shortcode, URL, and folder name
4. **Global settings** - Settings that apply everywhere (concurrency, userAgent, retries, etc.)

### System Configuration

Each system in the `systems` array requires:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `system` | `string` | Yes | System shortcode (e.g., `gbc`, `snes`, `psx`) - see [System Shortcodes](#system-shortcodes) |
| `url` | `string` | Yes | Archive directory URL to process |
| `folder` | `string` | No | Folder name within `downloadDir` (defaults to system shortcode) |
| `tableId` | `string` | No | Override default table ID |
| `whitelist` | `string[]` | No | Override default whitelist |
| `blacklist` | `string[]` | No | Override default blacklist |
| `dedupe` | `object` | No | Override default dedupe preferences |

The final download path is computed as `{downloadDir}/{folder}` (e.g., `./downloads/roms/gbc`). If `folder` is not specified, it defaults to the system shortcode.

### Default Settings

Settings in `defaults` are inherited by all systems unless overridden:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tableId` | `string` | `"list"` | HTML table ID containing the file list |
| `whitelist` | `string[]` | `[]` | Only download files matching these terms |
| `blacklist` | `string[]` | `[]` | Exclude files matching these terms |
| `dedupe` | `object` | (see defaults) | Dedupe preferences (see [Dedupe Command](#dedupe-command)) |

### Global Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | `number` | `1` | Number of concurrent downloads (1-10) |
| `userAgent` | `string` | `"Wget/1.21.2"` | User-Agent header for requests |
| `requestTimeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `retries` | `number` | `2` | Number of retry attempts for failed requests |
| `logLevel` | `string` | `"info"` | Log level: `"debug"`, `"info"`, or `"silent"` |
| `scraper` | `object` | `undefined` | Scraper configuration (see below) |

### Scraper Configuration

The scraper supports multiple sources with fallback. Libretro is enabled by default (no auth required). ScreenScraper can be enabled for better accuracy when Libretro doesn't find a match.

**Note:** The system ID is determined automatically from the `system` shortcode. No need to specify it manually.

For detailed configuration documentation, see [src/scraper/README.md](src/scraper/README.md).

#### Minimal Configuration (Libretro Only)

With system shortcodes, the scraper works with no additional config. Libretro is enabled by default:

```json
{
  "downloadDir": "./downloads/roms",
  "systems": [
    {
      "system": "snes",
      "url": "https://example.com/roms/snes",
      "folder": "SNES"
    }
  ]
}
```

#### With ScreenScraper Fallback

Add ScreenScraper credentials to enable it as a fallback when Libretro doesn't find a match:

```json
{
  "downloadDir": "./downloads/roms",
  "systems": [
    {
      "system": "snes",
      "url": "https://example.com/roms/snes",
      "folder": "SNES"
    }
  ],
  "scraper": {
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

#### Scraper Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mediaType` | `string` | `"box-2D"` | Media type to download |
| `regionPriority` | `string[]` | `["us","wor","eu","jp"]` | Region preference order |
| `skipExisting` | `boolean` | `true` | Skip files that already have images |
| `resize` | `object` | - | Image resize options |
| `libretro` | `object` | - | Libretro adapter config |
| `screenscraper` | `object` | - | ScreenScraper adapter config |

### System Shortcodes

Use these shortcodes in the `system` field. Each shortcode maps to a system name and ID automatically.

Shortcodes are designed to match **Anbernic folder names** for easy compatibility.

#### Nintendo

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `gb` | Game Boy | |
| `gbc` | Game Boy Color | |
| `gba` | Game Boy Advance | |
| `nds` | Nintendo DS | |
| `vb` | Virtual Boy | |
| `gw` | Game & Watch | |
| `poke` | Pokemon Mini | `pokemini` |
| `nes` | NES | `fc` |
| `fds` | Famicom Disk System | |
| `snes` | SNES | `sfc` |
| `n64` | Nintendo 64 | |

#### Sega

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `sms` | Master System | |
| `gg` | Game Gear | |
| `md` | Mega Drive / Genesis | `genesis` |
| `mdcd` | Mega CD | `scd`, `segacd` |
| `32x` | 32X | |
| `saturn` | Saturn | |
| `dreamcast` | Dreamcast | `dc` |
| `pico` | Sega PICO | |
| `naomi` | Sega NAOMI | |

#### Sony

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `ps` | PlayStation | `psx`, `ps1` |
| `psp` | PSP | |

#### Atari

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `atari` | Atari 2600 | `2600` |
| `a5200` | Atari 5200 | `5200` |
| `a7800` | Atari 7800 | `7800` |
| `a800` | Atari 800 / 8-bit | |
| `lynx` | Atari Lynx | |

#### Arcade

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `mame` | MAME | `arcade` |
| `fbneo` | FinalBurn Neo | |
| `hbmame` | HBMAME | |
| `cps1` | Capcom CPS1 | |
| `cps2` | Capcom CPS2 | |
| `cps3` | Capcom CPS3 | |
| `neogeo` | SNK Neo Geo | |
| `atomiswave` | Atomiswave | |

#### Other

| Shortcode | System | Aliases |
|-----------|--------|---------|
| `pce` | PC Engine / TurboGrafx-16 | `tg16` |
| `pcecd` | PC Engine CD | |
| `ngp` | Neo Geo Pocket / Color | `ngpc` |
| `ws` | WonderSwan / Color | `wsc` |
| `coleco` | ColecoVision | |
| `intv` | Intellivision | |
| `c64` | Commodore 64 | |
| `msx` | MSX / MSX2 | |
| `dos` | MS-DOS | |
| `easyrpg` | EasyRPG | |
| `openbor` | OpenBOR | |

For the full list with all aliases, see [`src/systems/definitions.ts`](src/systems/definitions.ts).

#### Custom Systems

For systems not in the built-in registry, use `customSystems`:

```json
{
  "downloadDir": "./downloads/roms",
  "customSystems": {
    "my-system": {
      "name": "My Custom System",
      "systemId": 999,
      "extensions": [".rom", ".bin"]
    }
  },
  "systems": [
    {
      "system": "my-system",
      "url": "https://example.com/roms/custom"
    }
  ]
}
```

Custom systems can also override built-in definitions if needed.

See [src/scraper/README.md](src/scraper/README.md) for detailed adapter configuration

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
│   ├── systems/      # System registry
│   │   ├── definitions.ts # System shortcodes (edit this to add systems)
│   │   └── registry.ts    # Lookup functions
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
│   ├── purge/        # Blacklist-based file removal
│   ├── dedupe/       # Duplicate ROM detection and removal
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
