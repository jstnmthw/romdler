# Scraper

Downloads cover art for your files using multiple sources with fallback support.

## Table of Contents

- [Quick Start](#quick-start)
- [Sources](#sources)
  - [Libretro Thumbnails](#libretro-thumbnails-default)
  - [ScreenScraper](#screenscraper)
- [Best-Effort Matching](#best-effort-matching)
  - [How It Works](#how-it-works)
  - [Matching Priority](#matching-priority)
  - [Variant Patterns Stripped](#variant-patterns-stripped)
  - [Region Priority](#region-priority)
  - [Console Output](#console-output)
  - [Summary Breakdown](#summary-breakdown)
  - [Examples](#examples)
- [Configuration](#configuration)
  - [System Shortcodes](#system-shortcodes)
  - [Scraper Options](#scraper-options)
  - [Libretro Configuration](#libretro-configuration)
  - [ScreenScraper Configuration](#screenscraper-configuration)
  - [Resize Options](#resize-options)
- [Media Types](#media-types)
- [CLI Options](#cli-options)
- [Output](#output)
- [Architecture](#architecture)
  - [Main Scraper Flow](#main-scraper-flow)
  - [Adapter Fallback Chain](#adapter-fallback-chain)
  - [Libretro Manifest Fetching](#libretro-manifest-fetching)
  - [Libretro Filename Matching](#libretro-filename-matching)
  - [ScreenScraper Lookup](#screenscraper-lookup)
  - [Directory Structure](#directory-structure)
- [Types](#types)
- [Adding New Adapters](#adding-new-adapters)
- [Exit Codes](#exit-codes)
- [See Also](#see-also)

## Quick Start

The scraper processes all systems defined in your `app.config.json`. Each system uses a shortcode that automatically maps to the correct system name and ID:

```json
{
  "downloadDir": "./downloads/roms",
  "systems": [
    {
      "system": "gbc",
      "url": "https://example.com/roms/gbc"
    },
    {
      "system": "snes",
      "url": "https://example.com/roms/snes"
    }
  ]
}
```

The folder name defaults to the system shortcode (e.g., `gbc`, `snes`). You can override it with an explicit `folder` field if needed.

Run:
```bash
pnpm cli scrape
```

The scraper will process each system in order, downloading artwork to the `Imgs/` subdirectory of each system's folder. Libretro is used by default (no config needed).

## Sources

The scraper uses an adapter pattern with multiple sources. Sources are tried in priority order until artwork is found.

### Libretro Thumbnails (Default)

- **No authentication required**
- Uses filename-based matching against No-Intro naming conventions
- Fast direct downloads from CDN
- Covers 130+ systems

Libretro is enabled by default with priority 1. No configuration needed.

### ScreenScraper

- **Requires API credentials**
- Uses CRC32 hash-based matching for maximum accuracy
- Rate limited (respect API limits)
- Best for obscure titles that Libretro doesn't have

ScreenScraper is disabled by default. Enable it for fallback when Libretro doesn't find a match.

## Best-Effort Matching

When an exact filename match fails, the Libretro adapter uses a **manifest-based approach** for fast, intelligent matching.

### How It Works

1. **Manifest fetch** - Fetches file listing from GitHub API once per system (cached)
2. **Exact match** - Direct lookup in manifest
3. **Variant-stripped match** - Strips `(Proto)`, `(Beta)`, etc. but keeps region tags
4. **Title-only match** - Extracts base title and finds best match by region priority

This approach is **much faster** than per-file HTTP requests because all matching happens locally against the cached manifest.

### Matching Priority

| Priority | Match Type | Example |
|----------|-----------|---------|
| 1 | Exact match | `Game (USA)` -> `Game (USA)` |
| 2 | Variant-stripped (keep region) | `Game (USA) (Proto)` -> `Game (USA)` |
| 3 | Title-only (best region match) | `Game (USA)` -> `Game (World)` |

### Variant Patterns Stripped

| Category | Examples |
|----------|----------|
| Development | `(Proto)`, `(Proto 1)`, `(Beta)`, `(Demo)`, `(Sample)` |
| Platform variants | `(e-Reader)`, `(Virtual Console)`, `(Switch Online)`, `(Wii)` |
| Revisions | `(Rev 1)`, `(Rev A)`, `(v1.1)` |
| Unlicensed | `(Unl)`, `(Pirate)` |
| Publishers | `(Retro-Bit)`, `(Piko Interactive)`, `(Hudson)` |
| Special | `(Kiosk)`, `(Program)`, date suffixes like `(1992-10-06)` |
| BIOS | `[BIOS]` prefix |

### Region Priority

When multiple candidates match by title, the best region is selected:

1. `(World)` - Preferred, covers all regions
2. `(USA)` - US release
3. `(Japan, USA)` - Joint release
4. `(USA, Europe)` - Western release
5. `(Europe)` - EU release
6. `(Japan)` - Japanese release

### Console Output

Best-effort matches are displayed in **amber/orange** to distinguish them from exact matches:

```
[1/100] + Game (USA).zip -> Game (USA)                         # Exact (green)
[2/100] ~ Game (USA) (Proto).zip -> Game (USA) (best effort)   # Best-effort (amber)
[3/100] ? Unknown Game.zip (not in database)                   # Not found (blue)
```

### Summary Breakdown

The scrape summary shows a breakdown of exact vs best-effort matches:

```
--------------------------------------------------
Scrape Summary
--------------------------------------------------
  Total ROMs:      100
  Downloaded:      85
    Exact:         75
    Best effort:   10
  Skipped:         10
  Not found:       5
  Failed:          0
--------------------------------------------------

10 images used best-effort matching (filename variants).
```

### Examples

| ROM Filename | Best-Effort Match | Match Type |
|-------------|-------------------|------------|
| `Aladdin (USA) (Proto).zip` | `Aladdin (USA)` | Variant-stripped |
| `Donkey Kong (USA) (e-Reader).zip` | `Donkey Kong (World)` | Title-only |
| `Ice Climber (USA).zip` | `Ice Climber (World)` | Title-only |
| `Caveman Ninja (USA) (Beta).zip` | `Caveman Ninja (USA)` | Variant-stripped |
| `[BIOS] Demo Vision (USA).zip` | `Demo Vision (USA)` | Variant-stripped |

## Configuration

### System Shortcodes

Use shortcodes in the `system` field. Each shortcode automatically maps to the correct system name and ID. See the main [README.md](../../README.md#system-shortcodes) for the complete list.

For custom systems not in the registry, see `customSystems` in the main [README.md](../../README.md#custom-systems).

### Scraper Options

The scraper uses sensible defaults. Only configure what you want to change:

```json
{
  "scraper": {
    "mediaType": "ss",
    "regionPriority": ["jp", "us", "eu"]
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mediaType` | `string` | `"box-2D"` | Media type to download |
| `regionPriority` | `string[]` | `["us","wor","eu","jp"]` | Region preference order |
| `skipExisting` | `boolean` | `true` | Skip files that already have images |
| `resize` | `object` | `{ enabled: false }` | Image resize options |

### Libretro Configuration

Libretro is **enabled by default** with priority 1. No configuration needed unless you want to disable it:

```json
{
  "scraper": {
    "libretro": {
      "enabled": false
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable Libretro adapter |
| `priority` | `number` | `1` | Priority (lower = tried first, range 1-100) |

### ScreenScraper Configuration

ScreenScraper is **disabled by default**. Enable it with credentials for fallback when Libretro doesn't find a match:

```json
{
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable ScreenScraper adapter |
| `priority` | `number` | `2` | Priority (lower = tried first, range 1-100) |
| `credentials` | `object` | - | API credentials (required if enabled) |
| `rateLimitMs` | `number` | `1000` | Delay between API requests (ms, range 100-10000) |

#### Getting ScreenScraper Credentials

1. Register a free account at [screenscraper.fr](https://www.screenscraper.fr/)
2. Request developer credentials via the ScreenScraper forums
3. Add credentials to your config file

### Resize Options

Resize is **disabled by default**. Enable it to resize downloaded images:

```json
{
  "scraper": {
    "resize": {
      "enabled": true,
      "maxWidth": 200,
      "maxHeight": 200
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable image resizing |
| `maxWidth` | `number` | `300` | Maximum width in pixels (100-1000) |
| `maxHeight` | `number` | `300` | Maximum height in pixels (100-1000) |

## Media Types

Media type availability depends on the source adapter:

| Type | Description | Libretro | ScreenScraper |
|------|-------------|----------|---------------|
| `box-2D` | 2D box art (front cover) - **default** | Yes | Yes |
| `box-3D` | 3D box art render | No | Yes |
| `ss` | In-game screenshot | Yes | Yes |
| `sstitle` | Title screen | Yes | Yes |
| `wheel` | Logo/wheel art | No | Yes |
| `mixrbv1` | Mix image v1 (composite) | No | Yes |
| `mixrbv2` | Mix image v2 (composite) | No | Yes |
| `marquee` | Arcade marquee | No | Yes |
| `fanart` | Fan artwork | No | Yes |
| `video` | Video preview | No | Yes |

**Libretro aliases:** `boxart` (for `box-2D`), `snap`/`screenshot` (for `ss`), `title` (for `sstitle`).

## CLI Options

```bash
# Preview what would be downloaded
pnpm cli scrape --dry-run      # or -n

# Force re-download (overwrite existing)
pnpm cli scrape --force        # or -f

# Limit to first N files
pnpm cli scrape --limit 10     # or -l 10

# Override media type
pnpm cli scrape --media ss     # or -m ss

# Override region priority
pnpm cli scrape --region us,eu,jp  # or -r us,eu,jp

# Use custom config file
pnpm cli scrape --config ./my-config.json  # or -c ./my-config.json
```

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would happen without downloading |
| `--force` | `-f` | Overwrite existing images |
| `--limit <N>` | `-l` | Limit to first N files |
| `--media <type>` | `-m` | Override media type (box-2D, ss, sstitle, etc.) |
| `--region <list>` | `-r` | Override region priority (comma-separated) |
| `--config <path>` | `-c` | Use custom config file path |

## Output

Images are saved to an `Imgs/` subdirectory:

```
downloads/roms/snes/
├── Super Mario Kart (USA).zip
├── Zelda (USA).zip
└── Imgs/
    ├── Super Mario Kart (USA).png
    └── Zelda (USA).png
```

This follows the convention used by Anbernic devices, EmulationStation, and other frontends.

## Architecture

### Main Scraper Flow

The scraper scans a ROM directory and processes each file, checking if artwork already exists before attempting to download.

```mermaid
flowchart TD
    A[Start] --> B[Scan ROM Directory]
    B --> C[For Each ROM File]
    C --> D{Skip Existing?}
    D -->|Yes & Exists| E[Skip]
    D -->|No| F[Try Adapters]
    F --> G{Found?}
    G -->|Yes| H[Download Image]
    G -->|No| I[Mark Not Found]
    H --> J[Save to Imgs/]
    J --> K{More ROMs?}
    E --> K
    I --> K
    K -->|Yes| C
    K -->|No| L[Print Summary]
```

### Adapter Fallback Chain

Adapters are tried in priority order. If Libretro doesn't find a match, ScreenScraper is tried next (if configured).

```mermaid
flowchart LR
    A[ROM File] --> B[Libretro<br/>Priority 1]
    B -->|Found| C[Download]
    B -->|Not Found| D{ScreenScraper<br/>Enabled?}
    D -->|Yes| E[ScreenScraper<br/>Priority 2]
    D -->|No| F[Not Found]
    E -->|Found| C
    E -->|Not Found| F
```

### Libretro Manifest Fetching

Libretro uses a cached manifest for fast lookups. The manifest is fetched from GitHub API, with CDN fallback when rate-limited.

```mermaid
flowchart TD
    A[Get Manifest] --> B{Cached?}
    B -->|Yes| C[Use Cache]
    B -->|No| D[Fetch from GitHub API]
    D -->|Success| E[Cache & Use]
    D -->|Rate Limited| F[Fallback to CDN]
    F -->|Success| E
    F -->|Fail| G[Error]
    C --> H[Match Filename]
    E --> H
```

### Libretro Filename Matching

Three-phase matching: exact match first, then variant-stripped, finally title-only with region priority.

```mermaid
flowchart TD
    A[Filename] --> B{Exact Match?}
    B -->|Yes| C[Return Match]
    B -->|No| D[Strip Variant Tags]
    D --> E{Match?}
    E -->|Yes| F[Return Best-Effort]
    E -->|No| G[Title-Only Search]
    G --> H{Match?}
    H -->|Yes| F
    H -->|No| I[Not Found]
```

### ScreenScraper Lookup

ScreenScraper uses CRC32 hash-based matching for maximum accuracy against their database.

```mermaid
flowchart LR
    A[ROM File] --> B[Calculate CRC32]
    B --> C[API Lookup by Hash]
    C -->|Found| D[Return Match]
    C -->|Not Found| E[Not Found]
```

### Directory Structure

```
src/scraper/
├── adapters/           # Adapter interface & registry
│   ├── types.ts        # ArtworkAdapter interface
│   ├── registry.ts     # Adapter registration & fallback logic
│   └── index.ts
├── libretro/           # Libretro Thumbnails adapter
│   ├── adapter.ts      # Implementation
│   ├── manifest.ts     # Manifest fetching and matching
│   ├── cdn-parser.ts   # CDN directory listing parser
│   ├── systems.ts      # System ID to folder name mapping
│   ├── sanitizer.ts    # Filename sanitization
│   └── index.ts
├── screenscraper/      # ScreenScraper adapter
│   ├── adapter.ts      # Implementation
│   ├── client.ts       # API client
│   ├── systems.ts      # System definitions
│   ├── types.ts        # API types
│   └── index.ts
├── scraper.ts          # Main orchestrator
├── scanner.ts          # Directory scanning
├── hasher.ts           # CRC32 calculation
├── downloader.ts       # Image downloading
├── reporter.ts         # Console output
├── types.ts            # Shared scraper types
└── index.ts            # Module exports
```

## Types

### RomFile

Information about a ROM file to scrape:

```typescript
type RomFile = {
  /** Absolute path to the file */
  path: string;
  /** Filename with extension */
  filename: string;
  /** Filename without extension (stem) */
  stem: string;
  /** File size in bytes */
  size: number;
};
```

### ArtworkLookupResult

Result from an artwork lookup:

```typescript
type ArtworkLookupResult = {
  found: boolean;
  /** Game identifier from the source */
  gameId?: string;
  /** Game name from the source */
  gameName?: string;
  /** Direct URL to download the media */
  mediaUrl?: string;
  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
  /** True if this was a fuzzy/best-effort match (not exact) */
  bestEffort?: boolean;
  /** The original ROM name before transformation (for best-effort matches) */
  originalName?: string;
};
```

### LookupParams

Parameters for artwork lookup:

```typescript
type LookupParams = {
  /** ROM file information */
  rom: RomFile;
  /** CRC32 hash (if calculated) */
  crc?: string;
  /** System/platform identifier */
  systemId: number;
  /** Preferred media type */
  mediaType: string;
  /** Region priority for media selection */
  regionPriority: string[];
};
```

### AdapterCapabilities

Capabilities a source adapter supports:

```typescript
type AdapterCapabilities = {
  /** Supports hash-based ROM identification */
  hashLookup: boolean;
  /** Supports filename-based lookup */
  filenameLookup: boolean;
  /** Media types available (source-specific identifiers) */
  mediaTypes: string[];
  /** Platform system IDs supported, or 'all' for universal support */
  platforms: number[] | 'all';
};
```

## Adding New Adapters

1. Create a new directory: `src/scraper/newadapter/`
2. Implement the `ArtworkAdapter` interface from `adapters/types.ts`
3. Create a factory function
4. Register in `scraper.ts`
5. Add config schema in `src/config/schema.ts`

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success - all images downloaded or skipped |
| `1` | Failure - at least one download failed, or fatal error |

## See Also

- [Downloader README](../downloader/README.md) - Download ROM files from archive sites
- [Purge README](../purge/README.md) - Remove unwanted files using blacklist patterns
- [Main README](../../README.md) - Full configuration reference
