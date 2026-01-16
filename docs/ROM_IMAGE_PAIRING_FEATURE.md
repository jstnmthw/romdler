# ROM Image Pairing Feature - Research & Design Document

## Overview

This document outlines the research and design for a feature that automatically downloads cover art and screenshots for ROM files from a remote source (ScreenScraper API). This enables visual ROM browsing on devices like Anbernic handhelds and EmulationStation-based frontends.

**Chosen Approach:** Remote scraping from ScreenScraper.fr API using CRC32 hash-based ROM identification.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Industry Standard Conventions](#industry-standard-conventions)
3. [Data Source](#data-source)
4. [Chosen Implementation Approach](#chosen-implementation-approach)
5. [ScreenScraper API Reference](#screenscraper-api-reference)
6. [Technical Implementation Details](#technical-implementation-details)
7. [Proposed Architecture](#proposed-architecture)
8. [Configuration Schema](#configuration-schema)
9. [Error Handling](#error-handling)
10. [References](#references)

---

## Problem Statement

After downloading ROMs, users need associated artwork (box art, screenshots, title screens) to:
- Enable visual browsing on handheld devices (Anbernic RG35XX, Miyoo Mini, etc.)
- Populate EmulationStation and other frontend interfaces
- Create a more polished retro gaming experience

The challenge is matching ROM filenames to the correct game artwork from external databases.

---

## Industry Standard Conventions

### Folder Structure

The universally accepted convention (used by Anbernic stock OS, OnionOS, EmulationStation, etc.):

```
[ROM_FOLDER]/
├── Game Name (USA).zip
├── Another Game (Europe).zip
└── Imgs/
    ├── Game Name (USA).png
    └── Another Game (Europe).png
```

### Naming Rules

| Rule | Description |
|------|-------------|
| **Exact Match** | Image filename must exactly match ROM filename (excluding extension) |
| **Case Sensitive** | Most systems treat filenames as case-sensitive |
| **Extension** | Images typically use `.png` or `.jpg` |
| **Special Characters** | Preserve parentheses, brackets, commas, etc. from ROM names |

### Image Specifications

| Property | Recommended Value |
|----------|-------------------|
| Format | PNG (preferred) or JPG |
| Dimensions | 282×216px (Anbernic stock) or up to 300px wide |
| Aspect Ratio | 4:3 (to avoid stretching/squishing) |
| File Size | Keep small for device performance |

### Example Pairing

```
ROM:   Super Mario Kart (USA).zip
Image: Imgs/Super Mario Kart (USA).png
       ↑ Must match exactly (minus extension)
```

---

## Data Source

### ScreenScraper.fr (Chosen)

**Website:** https://www.screenscraper.fr/

ScreenScraper is the chosen data source for this feature. It is the most comprehensive retro gaming media database available, containing:

- Box art (2D and 3D renders)
- Screenshots and title screens
- Wheel/marquee artwork
- Videos, fanart, manuals
- Support for 100+ gaming systems

**Why ScreenScraper:**

| Advantage | Description |
|-----------|-------------|
| **Hash-based Matching** | CRC32, MD5, SHA1 lookups ensure accurate game identification |
| **Comprehensive Coverage** | Largest retro gaming media database |
| **Multiple Media Types** | Box art, screenshots, title screens, wheels, and more |
| **Region Support** | Media available for US, EU, JP, and other regions |
| **Active Community** | Continuously updated with new games and media |

**Requirements:**

1. **User Account** - Free registration at screenscraper.fr
2. **Developer Credentials** - Request via ScreenScraper forums (simple process)
3. **Rate Limiting** - Respect API limits (implement delays between requests)

### Alternative Sources (For Reference)

These sources were considered but ScreenScraper was chosen for its superior hash-based matching:

| Source | URL | Notes |
|--------|-----|-------|
| TheGamesDB | https://thegamesdb.net/ | Free, no auth, but filename-based matching only |
| IGDB | https://www.igdb.com/ | Modern games focus, less retro coverage |
| LaunchBox | https://gamesdb.launchbox-app.com/ | Good coverage, no public API |
| OpenVGDB | https://github.com/OpenVGDB/OpenVGDB | SQLite DB, offline but requires manual updates |

---

## Chosen Implementation Approach

### Remote Scraping from ScreenScraper API

This feature will automatically download artwork for ROMs from the ScreenScraper.fr database using hash-based identification. This approach provides fully automated artwork acquisition without requiring users to manually source images.

### How It Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Scan ROM Dir   │────▶│  Calculate CRC  │────▶│  Query SS API   │
│  for files      │     │  for each ROM   │     │  with hash      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Generate       │◀────│  Save to Imgs/  │◀────│  Download       │
│  Report         │     │  with ROM name  │     │  media file     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Process Steps

1. **Scan ROM directory** for supported file extensions (`.zip`, `.sfc`, `.smc`, etc.)
2. **For each ROM file:**
   - Calculate CRC32 hash of the file
   - Query ScreenScraper API with hash + system ID
   - Select preferred media type from response (box art, screenshot, etc.)
   - Download image from returned URL
   - Save to `Imgs/` subdirectory with matching ROM filename
3. **Handle failures gracefully** with rate limiting, retries, and skip-on-error
4. **Generate summary report** of matched/failed/skipped ROMs

### Why This Approach

| Benefit | Description |
|---------|-------------|
| **Fully Automated** | No manual image sourcing required |
| **High Accuracy** | CRC32 hash matching ensures correct game identification |
| **Rich Media Options** | Access to box art, screenshots, title screens, and more |
| **Industry Standard** | ScreenScraper is the most comprehensive retro gaming database |

### Requirements

- ScreenScraper.fr user account (free registration)
- Developer API credentials (request via ScreenScraper forums)
- Network connectivity during scraping

### Considerations

- **Rate Limiting:** ScreenScraper enforces request limits; implement polite delays
- **API Quotas:** Free accounts have daily limits; premium accounts have higher quotas
- **Network Dependent:** Requires internet access during scraping operation

---

### Alternative Approaches (Not Implemented)

For reference, other approaches were considered but not chosen:

**Local Matching Only:** Scan for pre-existing `Imgs/` folder and match by filename. Limited because it requires users to already have images.

**Hybrid (Match + Scrape):** Check for existing images first, only scrape missing. Adds complexity without significant benefit for the primary use case of fresh downloads.

---

## ScreenScraper API Reference

### Base URL

```
https://api.screenscraper.fr/api2/
```

### Authentication Parameters

| Parameter | Description | Required |
|-----------|-------------|----------|
| `devid` | Developer ID | Yes |
| `devpassword` | Developer password | Yes |
| `softname` | Your application name | Yes |
| `ssid` | User's ScreenScraper ID | Yes |
| `sspassword` | User's ScreenScraper password | Yes |
| `output` | Response format (`json` or `xml`) | Yes |

### Game Lookup Endpoint: `jeuInfos.php`

**Purpose:** Retrieve game information and media URLs.

**ROM Identification Parameters:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `crc` | CRC32 hash (preferred) | `50ABC90A` |
| `md5` | MD5 hash | `d41d8cd98f00b204e9800998ecf8427e` |
| `sha1` | SHA1 hash | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| `systemeid` | System ID (see below) | `4` (SNES) |
| `romnom` | ROM filename | `Super Mario Kart (USA).zip` |
| `romtaille` | ROM file size in bytes | `749652` |

**Example Request:**

```
https://api.screenscraper.fr/api2/jeuInfos.php?
  devid=xxx&
  devpassword=yyy&
  softname=romdler&
  ssid=user&
  sspassword=pass&
  output=json&
  crc=50ABC90A&
  systemeid=4&
  romnom=Super%20Mario%20Kart%20(USA).zip&
  romtaille=749652
```

### System IDs

| System | ID | Extensions |
|--------|-----|------------|
| Sega Genesis/Mega Drive | 1 | `.gen`, `.md`, `.smd`, `.bin`, `.zip` |
| Sega Master System | 2 | `.sms`, `.zip` |
| NES/Famicom | 3 | `.nes`, `.zip` |
| SNES/Super Famicom | 4 | `.sfc`, `.smc`, `.zip` |
| Game Boy | 9 | `.gb`, `.zip` |
| Game Boy Color | 10 | `.gbc`, `.zip` |
| Game Boy Advance | 12 | `.gba`, `.zip` |
| Nintendo 64 | 14 | `.n64`, `.v64`, `.z64`, `.zip` |
| Sega Saturn | 22 | `.bin`, `.cue`, `.iso`, `.chd` |
| Sega Dreamcast | 23 | `.chd`, `.cdi`, `.gdi`, `.cue` |
| PlayStation | 57 | `.bin`, `.cue`, `.pbp`, `.chd`, `.m3u` |
| Atari 2600 | 26 | `.a26`, `.bin`, `.zip` |
| Neo Geo | 142 | `.zip` |
| MAME | 75 | `.zip` |

### Media Types

| Type | Description |
|------|-------------|
| `ss` | Screenshot (in-game) |
| `sstitle` | Title screen |
| `box-2D` | 2D box art (front) |
| `box-3D` | 3D box art render |
| `mixrbv1` | Mix image v1 (composite) |
| `mixrbv2` | Mix image v2 (composite) |
| `wheel` | Logo/wheel art |
| `marquee` | Arcade marquee |
| `fanart` | Fan artwork |
| `video` | Video preview |

### Region Codes

| Code | Region |
|------|--------|
| `wor` | World |
| `us` | United States |
| `eu` | Europe |
| `jp` | Japan |
| `kr` | Korea |
| `asi` | Asia |

### Response Structure (JSON)

```json
{
  "response": {
    "jeu": {
      "id": "12345",
      "noms": [
        { "region": "us", "text": "Super Mario Kart" }
      ],
      "medias": [
        {
          "type": "box-2D",
          "region": "us",
          "url": "https://screenscraper.fr/medias/..."
        },
        {
          "type": "ss",
          "region": "wor",
          "url": "https://screenscraper.fr/medias/..."
        }
      ]
    }
  }
}
```

---

## Technical Implementation Details

### CRC32 Calculation

For compressed ROMs (`.zip`), calculate CRC of the archive file itself:

```typescript
import { createReadStream } from 'fs';
import { crc32 } from 'crc'; // or use zlib.crc32

async function calculateCRC32(filePath: string): Promise<string> {
  const CHUNK_SIZE = 65536; // 64KB chunks
  let crc = 0;

  const stream = createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

  for await (const chunk of stream) {
    crc = crc32(chunk, crc);
  }

  // Return as 8-character uppercase hex
  return (crc >>> 0).toString(16).toUpperCase().padStart(8, '0');
}
```

### ROM Discovery

```typescript
import { glob } from 'glob';
import path from 'path';

interface RomFile {
  path: string;
  filename: string;
  stem: string;      // filename without extension
  extension: string;
}

async function discoverRoms(directory: string, extensions: string[]): Promise<RomFile[]> {
  const patterns = extensions.map(ext => `**/*${ext}`);
  const files = await glob(patterns, {
    cwd: directory,
    nodir: true,
    ignore: ['**/Imgs/**', '**/.*']  // Skip Imgs folder and hidden files
  });

  return files.map(file => {
    const filename = path.basename(file);
    const ext = path.extname(filename);
    return {
      path: path.join(directory, file),
      filename,
      stem: path.basename(filename, ext),
      extension: ext
    };
  });
}
```

### ScreenScraper API Client

```typescript
interface ScrapeResult {
  rom: RomFile;
  status: 'downloaded' | 'not_found' | 'failed';
  imagePath?: string;
  error?: string;
}

interface ScreenScraperConfig {
  devId: string;
  devPassword: string;
  userId: string;
  userPassword: string;
  softName: string;
}

async function lookupGame(
  config: ScreenScraperConfig,
  crc: string,
  systemId: number,
  romName: string,
  romSize: number
): Promise<GameResponse | null> {
  const params = new URLSearchParams({
    devid: config.devId,
    devpassword: config.devPassword,
    softname: config.softName,
    ssid: config.userId,
    sspassword: config.userPassword,
    output: 'json',
    crc: crc,
    systemeid: systemId.toString(),
    romnom: romName,
    romtaille: romSize.toString()
  });

  const response = await fetch(
    `https://api.screenscraper.fr/api2/jeuInfos.php?${params}`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

function selectMedia(
  medias: Media[],
  preferredType: string,
  regionPriority: string[]
): string | null {
  // Filter by media type
  const typeMatches = medias.filter(m => m.type === preferredType);
  if (typeMatches.length === 0) return null;

  // Sort by region priority
  for (const region of regionPriority) {
    const match = typeMatches.find(m => m.region === region);
    if (match) return match.url;
  }

  // Fallback to first available
  return typeMatches[0]?.url ?? null;
}
```

### Image Download & Resize

```typescript
import sharp from 'sharp'; // For image resizing

async function downloadAndSaveImage(
  url: string,
  outputPath: string,
  resize?: { width: number; height: number }
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (resize) {
    await sharp(buffer)
      .resize(resize.width, resize.height, { fit: 'inside' })
      .png()
      .toFile(outputPath);
  } else {
    await fs.writeFile(outputPath, buffer);
  }
}
```

---

## Proposed Architecture

### Module Structure

```
src/
├── scraper/
│   ├── index.ts           // Public API exports
│   ├── types.ts           // TypeScript interfaces
│   ├── scanner.ts         // ROM directory scanning
│   ├── hasher.ts          // CRC32 hash calculation
│   ├── screenscraper/
│   │   ├── client.ts      // ScreenScraper API client
│   │   ├── types.ts       // API response types
│   │   └── systems.ts     // System ID mappings
│   ├── downloader.ts      // Image download & processing
│   └── reporter.ts        // Results summary generation
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Configuration                        │
│  (downloadDir, credentials, mediaType, region, resize options)  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         ROM Scanner                              │
│         Discovers ROMs by extension, extracts metadata          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Hash Calculator                            │
│              Computes CRC32 for each ROM file                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ScreenScraper API Client                      │
│         Queries API with hash, system ID, filename              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Media Selector                             │
│     Picks best media URL by type preference and region          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Image Downloader                            │
│        Downloads image, optionally resizes, saves to Imgs/      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Results Reporter                           │
│          Summarizes: downloaded, failed, not found              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration Schema

### Proposed Config Addition

```json
{
  "urls": ["..."],
  "downloadDir": "./downloads/roms/snes",

  "scraper": {
    "enabled": true,
    "source": "screenscraper",
    "credentials": {
      "devId": "your_dev_id",
      "devPassword": "your_dev_password",
      "userId": "your_ss_username",
      "userPassword": "your_ss_password"
    },
    "systemId": 4,
    "mediaType": "box-2D",
    "regionPriority": ["us", "wor", "eu", "jp"],
    "resize": {
      "enabled": true,
      "maxWidth": 300,
      "maxHeight": 300
    },
    "skipExisting": true,
    "rateLimitMs": 1000
  }
}
```

### Environment Variables (Alternative for Credentials)

```bash
SCREENSCRAPER_DEV_ID=xxx
SCREENSCRAPER_DEV_PASSWORD=xxx
SCREENSCRAPER_USER_ID=xxx
SCREENSCRAPER_USER_PASSWORD=xxx
```

---

## Error Handling

### Recoverable Errors

| Error | Handling |
|-------|----------|
| ROM not found in database | Log warning, continue to next |
| Rate limited (429) | Exponential backoff, retry |
| Network timeout | Retry with backoff |
| Image download failed | Log, mark as failed, continue |

### Fatal Errors

| Error | Handling |
|-------|----------|
| Invalid credentials | Stop, display auth error |
| Invalid system ID | Stop, display config error |
| No write permission to Imgs/ | Stop, display permission error |

### Retry Policy

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};
```

---

## CLI Commands

### Proposed Commands

```bash
# Preview: scan ROMs and show what would be scraped (no downloads)
romdler scrape --dry-run

# Scrape images for all ROMs in downloadDir
romdler scrape

# Force re-scrape all (overwrite existing images)
romdler scrape --force

# Scrape with specific media type
romdler scrape --media box-2D
romdler scrape --media ss          # screenshots
romdler scrape --media sstitle     # title screens

# Scrape with region preference
romdler scrape --region us,wor,eu,jp

# Limit number of ROMs to process
romdler scrape --limit 10

# Use custom config file
romdler scrape --config ./my-config.json
```

### Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run`, `-n` | Preview mode, no downloads | `false` |
| `--force`, `-f` | Overwrite existing images | `false` |
| `--media`, `-m` | Media type to download | `box-2D` |
| `--region`, `-r` | Region priority (comma-separated) | `us,wor,eu,jp` |
| `--limit`, `-l` | Max ROMs to process | unlimited |
| `--config`, `-c` | Config file path | `./app.config.json` |

---

## References

### Documentation & APIs

- [ScreenScraper.fr](https://www.screenscraper.fr/) - Primary game database
- [ScreenScraper API Forums](https://www.screenscraper.fr/forumsujets.php?fression=6&numpage=0) - Developer resources
- [Skyscraper Scraping Modules](https://gemba.github.io/skyscraper/SCRAPINGMODULES/) - Alternative scraper docs

### Reference Implementations

- [tiny-scraper](https://github.com/Julioevm/tiny-scraper) - Python scraper for Anbernic devices
- [Skyscraper](https://github.com/muldjord/skyscraper) - C++ multi-source scraper
- [sscraper](https://github.com/zayamatias/sscraper) - Python ScreenScraper tool

### Device Documentation

- [Anbernic RG35XX Starter Guide](https://retrogamecorps.com/2024/06/07/anbernic-rg35xx-family-starter-guide/)
- [Onion OS ROM Folders](https://onionui.github.io/docs/emulators/folders)
- [OnionUI Scraper Docs](https://onionui.github.io/docs/apps/scraper)

---

## Appendix: Full System ID List

<details>
<summary>Click to expand full system ID mapping</summary>

| ID | System |
|----|--------|
| 1 | Sega Genesis / Mega Drive |
| 2 | Sega Master System |
| 3 | Nintendo Entertainment System |
| 4 | Super Nintendo |
| 5 | Game Gear |
| 9 | Game Boy |
| 10 | Game Boy Color |
| 12 | Game Boy Advance |
| 14 | Nintendo 64 |
| 22 | Sega Saturn |
| 23 | Sega Dreamcast |
| 26 | Atari 2600 |
| 27 | Atari 7800 |
| 43 | Atari Lynx |
| 57 | Sony PlayStation |
| 58 | Sony PSP |
| 66 | Commodore 64 |
| 75 | MAME |
| 106 | Nintendo DS |
| 142 | SNK Neo Geo |

</details>
