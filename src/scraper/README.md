# Artwork Downloader

Downloads cover art for your files using multiple sources with fallback support.

## Quick Start

Add to your `app.config.json`:

```json
{
  "scraper": {
    "enabled": true,
    "systemId": 10
  }
}
```

Run:
```bash
pnpm start -- scrape
```

## Sources

The artwork downloader uses an adapter pattern with multiple sources. Sources are tried in priority order until artwork is found.

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

## Configuration

### Common Options

These apply to all adapters:

```json
{
  "scraper": {
    "enabled": true,
    "systemId": 10,
    "mediaType": "box-2D",
    "regionPriority": ["us", "wor", "eu", "jp"],
    "skipExisting": true,
    "resize": {
      "enabled": false,
      "maxWidth": 300,
      "maxHeight": 300
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable artwork downloading |
| `systemId` | `number` | (required) | System ID for platform identification |
| `mediaType` | `string` | `"box-2D"` | Media type to download |
| `regionPriority` | `string[]` | `["us","wor","eu","jp"]` | Region preference order |
| `skipExisting` | `boolean` | `true` | Skip files that already have images |
| `resize` | `object` | - | Image resize options |

### Libretro Configuration

```json
{
  "scraper": {
    "libretro": {
      "enabled": true,
      "priority": 1
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable Libretro adapter |
| `priority` | `number` | `1` | Priority (lower = tried first) |

### ScreenScraper Configuration

```json
{
  "scraper": {
    "screenscraper": {
      "enabled": true,
      "priority": 2,
      "credentials": {
        "devId": "YOUR_DEV_ID",
        "devPassword": "YOUR_DEV_PASSWORD",
        "userId": "YOUR_USERNAME",
        "userPassword": "YOUR_PASSWORD"
      },
      "rateLimitMs": 1000
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable ScreenScraper adapter |
| `priority` | `number` | `2` | Priority (lower = tried first) |
| `credentials` | `object` | - | API credentials (required if enabled) |
| `rateLimitMs` | `number` | `1000` | Delay between API requests (ms) |

#### Getting ScreenScraper Credentials

1. Register a free account at [screenscraper.fr](https://www.screenscraper.fr/)
2. Request developer credentials via the ScreenScraper forums
3. Add credentials to your config file

### Resize Options

```json
{
  "scraper": {
    "resize": {
      "enabled": true,
      "maxWidth": 300,
      "maxHeight": 300
    }
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable image resizing |
| `maxWidth` | `number` | `300` | Maximum width in pixels (100-1000) |
| `maxHeight` | `number` | `300` | Maximum height in pixels (100-1000) |

## System IDs

| System | ID | System | ID |
|--------|-----|--------|-----|
| Sega Mega Drive / Genesis | 1 | Sega Master System | 2 |
| NES | 3 | SNES | 4 |
| Sega Game Gear | 5 | Nintendo Game Boy | 9 |
| Nintendo Game Boy Color | 10 | Nintendo Virtual Boy | 11 |
| Nintendo Game Boy Advance | 12 | Nintendo 64 | 14 |
| Sega 32X | 19 | Sega Mega-CD | 20 |
| Sega Saturn | 22 | Sega Dreamcast | 23 |
| Atari 2600 | 26 | Atari 7800 | 27 |
| NEC PC Engine / TurboGrafx-16 | 31 | Atari Lynx | 43 |
| Bandai WonderSwan | 45 | Bandai WonderSwan Color | 46 |
| ColecoVision | 48 | Sony PlayStation | 57 |
| Sony PSP | 58 | Commodore 64 | 66 |
| MAME | 75 | SNK Neo Geo Pocket Color | 82 |
| Nintendo DS | 106 | NEC PC Engine CD | 114 |
| Mattel Intellivision | 115 | SNK Neo Geo | 142 |

See `screenscraper/systems.ts` for the complete list with ROM extensions.

## Media Types

| Type | Description |
|------|-------------|
| `box-2D` | 2D box art (front cover) - **default** |
| `box-3D` | 3D box art render |
| `ss` | In-game screenshot |
| `sstitle` | Title screen |
| `wheel` | Logo/wheel art |
| `mixrbv1` | Mix image v1 (composite) |
| `mixrbv2` | Mix image v2 (composite) |
| `marquee` | Arcade marquee |
| `fanart` | Fan artwork |

## CLI Options

```bash
# Preview what would be downloaded
pnpm start -- scrape --dry-run

# Force re-download (overwrite existing)
pnpm start -- scrape --force

# Limit to first N files
pnpm start -- scrape --limit 10

# Override media type
pnpm start -- scrape --media ss

# Override region priority
pnpm start -- scrape --region us,eu,jp

# Use specific source only
pnpm start -- scrape --source libretro
pnpm start -- scrape --source screenscraper
```

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

```
src/scraper/
├── adapters/           # Adapter interface & registry
│   ├── types.ts        # ArtworkAdapter interface
│   ├── registry.ts     # Adapter registration & fallback logic
│   └── index.ts
├── libretro/           # Libretro Thumbnails adapter
│   ├── adapter.ts      # Implementation
│   ├── systems.ts      # System ID to folder name mapping
│   └── sanitizer.ts    # Filename sanitization
├── screenscraper/      # ScreenScraper adapter
│   ├── adapter.ts      # Implementation
│   ├── client.ts       # API client
│   ├── systems.ts      # System definitions
│   └── types.ts        # API types
├── scraper.ts          # Main orchestrator
├── scanner.ts          # Directory scanning
├── hasher.ts           # CRC32 calculation
├── downloader.ts       # Image downloading
└── reporter.ts         # Console output
```

## Adding New Adapters

1. Create a new directory: `src/scraper/newadapter/`
2. Implement the `ArtworkAdapter` interface from `adapters/types.ts`
3. Create a factory function
4. Register in `scraper.ts`
5. Add config schema in `src/config/schema.ts`

See [docs/ARTWORK_ADAPTER_PATTERN.md](../../docs/ARTWORK_ADAPTER_PATTERN.md) for the full design document.
