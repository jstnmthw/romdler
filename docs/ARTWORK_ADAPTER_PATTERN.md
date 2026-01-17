# Artwork Scraper Adapter Pattern - Design & Implementation Plan

## Overview

This document outlines a refactoring of the scraper module to use an **adapter pattern** that allows swapping between different artwork sources. The current implementation is tightly coupled to ScreenScraper.fr, which requires API credentials and has rate limiting constraints. An adapter pattern enables:

- **Flexibility**: Switch between sources based on availability, speed, or credentials
- **Fallback chains**: Try multiple sources until artwork is found
- **Future-proofing**: Add new sources without modifying core scraper logic

---

## Implementation Status

| Adapter | Status | Notes |
|---------|--------|-------|
| **Libretro Thumbnails** | ✅ Implemented | Default source, no auth required |
| **ScreenScraper** | ✅ Implemented | Hash-based lookup, requires credentials |
| TheGamesDB | ⏳ Not Implemented | Documented for future use |
| IGDB | ⏳ Not Implemented | Documented for future use |
| ArcadeDB | ⏳ Not Implemented | Documented for future use |
| LaunchBox | ⏳ Not Implemented | Documented for future use |
| OpenVGDB | ⏳ Not Implemented | Documented for future use |

---

## Table of Contents

1. [Alternative Artwork Sources (Jan 2026)](#alternative-artwork-sources-jan-2026)
2. [Source Comparison Matrix](#source-comparison-matrix)
3. [Recommended Sources](#recommended-sources)
4. [Adapter Interface Design](#adapter-interface-design)
5. [Implementation Plan](#implementation-plan)
6. [Configuration Schema Changes](#configuration-schema-changes)
7. [Migration Strategy](#migration-strategy)
8. [References](#references)

---

## Alternative Artwork Sources (Jan 2026)

### 1. Libretro Thumbnails (Recommended - No API Required)

**Website:** https://thumbnails.libretro.com/ | [GitHub](https://github.com/libretro-thumbnails/libretro-thumbnails)

A community-maintained collection of boxart, title screens, and screenshots aligned with No-Intro DAT naming conventions. Hosted on a CDN with direct HTTP access.

| Aspect | Details |
|--------|---------|
| **Authentication** | None required |
| **Rate Limiting** | Standard HTTP, no API limits |
| **Identification** | Filename-based (No-Intro naming convention) |
| **Media Types** | Boxart, title screens, in-game screenshots |
| **Coverage** | 130+ systems, excellent for popular titles |
| **Pros** | Free, fast, no credentials, direct downloads |
| **Cons** | Requires ROM names to match No-Intro format exactly |

**URL Pattern:**
```
https://thumbnails.libretro.com/{System Name}/Named_Boxarts/{Game Name}.png
https://thumbnails.libretro.com/{System Name}/Named_Snaps/{Game Name}.png
https://thumbnails.libretro.com/{System Name}/Named_Titles/{Game Name}.png
```

**Filename Sanitization:** Characters `&*/:`<>?\|"` must be replaced with `_`

---

### 2. TheGamesDB

**Website:** https://thegamesdb.net/ | [API Docs](https://api.thegamesdb.net/)

Community-driven game database with good coverage of both retro and modern games.

| Aspect | Details |
|--------|---------|
| **Authentication** | API key (free tier available) |
| **Rate Limiting** | 1,500 requests/month (public key), 6,000/month (private key) |
| **Identification** | Game name search, platform filtering |
| **Media Types** | Boxart (front/back), screenshots, fanart, banners |
| **Coverage** | Excellent for popular titles, gaps in obscure games |
| **Pros** | Free tier, good documentation, active community |
| **Cons** | Monthly request limits, no hash-based lookup |

**API Endpoint:**
```
GET https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=XXX&name=Super%20Mario&filter[platform]=6
```

---

### 3. IGDB (Internet Games Database)

**Website:** https://www.igdb.com/ | [API Docs](https://api-docs.igdb.com/)

Owned by Twitch, comprehensive database for all games (modern focus).

| Aspect | Details |
|--------|---------|
| **Authentication** | Twitch OAuth (Client Credentials Flow) |
| **Rate Limiting** | 4 requests/second (free tier) |
| **Identification** | Game name search, platform filtering |
| **Media Types** | Cover art, screenshots, artwork |
| **Coverage** | Excellent for modern games, good retro coverage |
| **Pros** | No monthly limits, high-quality images, well-maintained |
| **Cons** | Twitch account required, no hash-based lookup, same artwork across platforms |

**Authentication Flow:**
```bash
POST https://id.twitch.tv/oauth2/token
  ?client_id=xxx&client_secret=xxx&grant_type=client_credentials
```

**API Endpoint:**
```
POST https://api.igdb.com/v4/covers
Headers: Client-ID, Authorization: Bearer {token}
Body: fields url; where game = 123;
```

---

### 4. ArcadeDB (Arcade Italia)

**Website:** http://adb.arcadeitalia.net/ | [Scraper API](http://adb.arcadeitalia.net/service_scraper.php)

The definitive database for MAME/arcade games.

| Aspect | Details |
|--------|---------|
| **Authentication** | None required |
| **Rate Limiting** | Bandwidth-based limits (IP/daily/weekly/monthly) |
| **Identification** | MAME ROM filename (exact match) |
| **Media Types** | Screenshots, title screens, flyers, marquees, videos |
| **Coverage** | Comprehensive for arcade/MAME only |
| **Pros** | Best arcade database, no auth required |
| **Cons** | Arcade/MAME only, bandwidth limits |

**URL Pattern:**
```
http://adb.arcadeitalia.net/service_scraper.php?ajax=query_mame&game_name={romname}
```

---

### 5. LaunchBox Games Database

**Website:** https://gamesdb.launchbox-app.com/

Community-driven database used by LaunchBox frontend.

| Aspect | Details |
|--------|---------|
| **Authentication** | None (scraping) or bulk download |
| **Rate Limiting** | Be respectful (web scraping) |
| **Identification** | Game name + platform search |
| **Media Types** | Box art, screenshots, clear logos, disc art |
| **Coverage** | Excellent across all platforms |
| **Pros** | Comprehensive coverage, high-quality images |
| **Cons** | No official public API, requires scraping or bulk DB download |

---

### 6. OpenVGDB

**Website:** [GitHub Releases](https://github.com/OpenVGDB/OpenVGDB/releases)

Offline SQLite database with ROM hashes and metadata.

| Aspect | Details |
|--------|---------|
| **Authentication** | None (offline database) |
| **Rate Limiting** | None (local queries) |
| **Identification** | CRC32, MD5, SHA1 hash lookup |
| **Media Types** | Metadata only (links to cover art sources) |
| **Coverage** | Good for hash lookups, references external images |
| **Pros** | Offline, hash-based identification, no rate limits |
| **Cons** | Requires periodic manual updates, doesn't host images directly |

---

### 7. ScreenScraper.fr (Current)

**Website:** https://www.screenscraper.fr/

| Aspect | Details |
|--------|---------|
| **Authentication** | Developer + User credentials required |
| **Rate Limiting** | Strict (free: ~20k requests/day, premium: higher) |
| **Identification** | CRC32, MD5, SHA1 hash lookup (most accurate) |
| **Media Types** | Box art, screenshots, wheels, videos, manuals |
| **Coverage** | Most comprehensive retro gaming database |
| **Pros** | Hash-based matching (highest accuracy), extensive media types |
| **Cons** | Requires credentials, rate limited, can be slow |

---

## Source Comparison Matrix

| Source | Auth Required | Hash Lookup | Rate Limits | Arcade | Console | Best For |
|--------|--------------|-------------|-------------|--------|---------|----------|
| **Libretro Thumbnails** | No | No | None | Limited | Excellent | Quick, credential-free scraping |
| **TheGamesDB** | API Key | No | 1,500/month | Good | Good | Backup source with API |
| **IGDB** | Twitch OAuth | No | 4/second | Poor | Excellent | Modern games, high-quality art |
| **ArcadeDB** | No | No (filename) | Bandwidth | Excellent | No | Arcade/MAME exclusively |
| **LaunchBox** | No (scrape) | No | Polite | Good | Excellent | Comprehensive fallback |
| **OpenVGDB** | No (offline) | Yes | None | Limited | Good | Hash lookup, offline use |
| **ScreenScraper** | Yes | Yes | Strict | Good | Excellent | Highest accuracy (hash) |

---

## Recommended Sources

### Primary Recommendation: Libretro Thumbnails

For most users, **Libretro Thumbnails** provides the best balance of:
- No authentication required
- No rate limits
- Fast direct downloads
- Good coverage for popular systems

**Limitation:** Requires ROM filenames to follow No-Intro naming conventions.

### Implemented Fallback Chain

```
1. Libretro Thumbnails (fast, no auth)
   ↓ if not found
2. ScreenScraper (hash-based accuracy)
```

### Future Fallback Chain (Not Yet Implemented)

```
1. Libretro Thumbnails (fast, no auth)
   ↓ if not found
2. ScreenScraper (hash-based accuracy)
   ↓ if no credentials or rate limited
3. TheGamesDB (API fallback)          [NOT IMPLEMENTED]
   ↓ if not found
4. ArcadeDB (arcade games only)       [NOT IMPLEMENTED]
```

### By Use Case

| Use Case | Recommended Source |
|----------|-------------------|
| Quick setup, no credentials | Libretro Thumbnails |
| Maximum accuracy | ScreenScraper (hash-based) |
| Arcade/MAME games | ArcadeDB |
| Modern games | IGDB |
| Offline/air-gapped | OpenVGDB + pre-downloaded images |

---

## Adapter Interface Design

### Core Interface

```typescript
// src/scraper/adapters/types.ts

/** Capabilities a source adapter supports */
type AdapterCapabilities = {
  /** Supports hash-based ROM identification */
  hashLookup: boolean;
  /** Supports filename-based lookup */
  filenameLookup: boolean;
  /** Media types available */
  mediaTypes: string[];
  /** Platforms/systems supported (or 'all') */
  platforms: number[] | 'all';
};

/** Result from an artwork lookup */
type ArtworkLookupResult = {
  found: boolean;
  gameId?: string;
  gameName?: string;
  mediaUrl?: string;
  /** Source-specific metadata */
  metadata?: Record<string, unknown>;
};

/** Parameters for artwork lookup */
type LookupParams = {
  /** ROM filename (with extension) */
  filename: string;
  /** ROM filename without extension */
  stem: string;
  /** File size in bytes */
  size: number;
  /** CRC32 hash (if calculated) */
  crc?: string;
  /** System/platform identifier */
  systemId: number;
  /** Preferred media type */
  mediaType: string;
  /** Region priority */
  regionPriority: string[];
};

/** Artwork source adapter interface */
interface ArtworkAdapter {
  /** Unique identifier for this adapter */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Adapter capabilities */
  readonly capabilities: AdapterCapabilities;

  /**
   * Initialize the adapter (auth, token refresh, etc.)
   * @returns true if ready to use
   */
  initialize(): Promise<boolean>;

  /**
   * Look up artwork for a ROM
   * @param params Lookup parameters
   * @returns Lookup result or null if not found
   */
  lookup(params: LookupParams): Promise<ArtworkLookupResult | null>;

  /**
   * Check if this adapter can handle the given system
   * @param systemId Platform/system ID
   */
  supportsSystem(systemId: number): boolean;

  /**
   * Get rate limit delay (ms) to wait between requests
   */
  getRateLimitDelay(): number;
}
```

### Adapter Registry

```typescript
// src/scraper/adapters/registry.ts

type AdapterConfig = {
  /** Adapter identifier */
  id: string;
  /** Whether this adapter is enabled */
  enabled: boolean;
  /** Priority (lower = tried first) */
  priority: number;
  /** Adapter-specific configuration */
  options?: Record<string, unknown>;
};

class AdapterRegistry {
  private adapters: Map<string, ArtworkAdapter> = new Map();

  register(adapter: ArtworkAdapter): void;
  get(id: string): ArtworkAdapter | undefined;
  getEnabled(configs: AdapterConfig[]): ArtworkAdapter[];

  /**
   * Try adapters in priority order until artwork is found
   */
  async lookupWithFallback(
    params: LookupParams,
    configs: AdapterConfig[]
  ): Promise<ArtworkLookupResult | null>;
}
```

---

## Implementation Plan

> **Note:** Only Libretro Thumbnails and ScreenScraper adapters are implemented. Other adapters (TheGamesDB, IGDB, ArcadeDB, etc.) are documented for future extension.

### Phase 1: Define Adapter Interface (Non-Breaking) ✅

**Files created:**
```
src/scraper/adapters/
├── types.ts           # Interface definitions
├── registry.ts        # Adapter registry
└── index.ts           # Barrel exports
```

**Tasks:**
1. Create `ArtworkAdapter` interface
2. Create `AdapterRegistry` class
3. Export from barrel

### Phase 2: Refactor ScreenScraper as Adapter ✅

**Files modified:**
```
src/scraper/screenscraper/
├── adapter.ts         # NEW: Implements ArtworkAdapter
├── client.ts          # Keep existing, used by adapter
└── index.ts           # Export adapter
```

**Tasks:**
1. Create `ScreenScraperAdapter` implementing `ArtworkAdapter`
2. Wrap existing `ScreenScraperClient`
3. Register adapter in registry
4. Update `scraper.ts` to use registry

### Phase 3: Implement Libretro Thumbnails Adapter ✅

**Files created:**
```
src/scraper/libretro/
├── adapter.ts         # ArtworkAdapter implementation
├── systems.ts         # System name mappings
├── sanitizer.ts       # Filename sanitization
└── index.ts           # Barrel exports
```

**System Name Mapping Example:**
```typescript
const SYSTEM_MAP: Record<number, string> = {
  1: 'Sega - Mega Drive - Genesis',
  3: 'Nintendo - Nintendo Entertainment System',
  4: 'Nintendo - Super Nintendo Entertainment System',
  9: 'Nintendo - Game Boy',
  10: 'Nintendo - Game Boy Color',
  12: 'Nintendo - Game Boy Advance',
  // ... etc
};
```

**URL Construction:**
```typescript
function buildLibretroUrl(
  systemName: string,
  gameStem: string,
  mediaType: 'boxart' | 'snap' | 'title'
): string {
  const sanitized = sanitizeFilename(gameStem);
  const folder = mediaType === 'boxart' ? 'Named_Boxarts'
               : mediaType === 'snap' ? 'Named_Snaps'
               : 'Named_Titles';

  return `https://thumbnails.libretro.com/${encodeURIComponent(systemName)}/${folder}/${encodeURIComponent(sanitized)}.png`;
}
```

### Phase 4: Implement TheGamesDB Adapter (Future)

> ⏳ **Not Implemented** - Documented for future extension.

**Files to create:**
```
src/scraper/thegamesdb/
├── adapter.ts
├── client.ts
├── types.ts
├── platforms.ts
└── index.ts
```

### Phase 5: Implement ArcadeDB Adapter (Future)

> ⏳ **Not Implemented** - Documented for future extension.

**Files to create:**
```
src/scraper/arcadedb/
├── adapter.ts
├── client.ts
└── index.ts
```

### Phase 6: Update Configuration & CLI ✅

**Tasks:**
1. Update Zod schema to support multiple sources
2. Add CLI flags for source selection
3. Update documentation

---

## Configuration Schema Changes

### Current Schema
```json
{
  "scraper": {
    "source": "screenscraper",
    "credentials": { ... }
  }
}
```

### Proposed Schema (Backward Compatible)
```json
{
  "scraper": {
    "enabled": true,
    "sources": [
      {
        "id": "libretro",
        "enabled": true,
        "priority": 1
      },
      {
        "id": "screenscraper",
        "enabled": true,
        "priority": 2,
        "credentials": {
          "devId": "...",
          "devPassword": "...",
          "userId": "...",
          "userPassword": "..."
        }
      },
      {
        "id": "thegamesdb",
        "enabled": false,
        "priority": 3,
        "apiKey": "..."
      },
      {
        "id": "arcadedb",
        "enabled": true,
        "priority": 4
      }
    ],
    "systemId": 4,
    "mediaType": "box-2D",
    "regionPriority": ["us", "wor", "eu", "jp"],
    "skipExisting": true,
    "rateLimitMs": 1000
  }
}
```

### Backward Compatibility

Support legacy `source: "screenscraper"` format by auto-converting to new schema during config load.

---

## Migration Strategy

### Step 1: Internal Refactor (No User Impact)
- Add adapter interface
- Wrap ScreenScraper in adapter
- All tests pass, behavior unchanged

### Step 2: Add Libretro Adapter
- New adapter available
- Default config unchanged (ScreenScraper primary)
- Document new `--source libretro` CLI flag

### Step 3: Update Default Configuration
- Libretro becomes default (no auth required)
- ScreenScraper available as fallback
- Update `app.config.example.json`

### Step 4: Add Additional Adapters
- TheGamesDB, ArcadeDB as optional
- Full fallback chain available

---

## Directory Structure

```
src/scraper/
├── adapters/
│   ├── types.ts              # Shared adapter interfaces
│   ├── registry.ts           # Adapter registry
│   └── index.ts
├── screenscraper/
│   ├── adapter.ts            # ArtworkAdapter implementation
│   ├── client.ts             # Existing API client
│   ├── types.ts
│   ├── systems.ts
│   └── index.ts
├── libretro/
│   ├── adapter.ts            # ArtworkAdapter implementation
│   ├── systems.ts            # System ID to folder name mapping
│   ├── sanitizer.ts          # Filename sanitization for URLs
│   └── index.ts
├── downloader.ts
├── hasher.ts
├── reporter.ts
├── scanner.ts
├── scraper.ts                 # Uses adapter registry
├── types.ts
└── index.ts
```

### Future Adapters (Not Implemented)

```
src/scraper/
├── thegamesdb/                # Future
│   ├── adapter.ts
│   ├── client.ts
│   ├── types.ts
│   └── index.ts
├── arcadedb/                  # Future
│   ├── adapter.ts
│   ├── client.ts
│   └── index.ts
```

---

## CLI Changes

### New Flags

```bash
# Use specific source
romdler scrape --source libretro
romdler scrape --source screenscraper
romdler scrape --source thegamesdb

# Use fallback chain (default)
romdler scrape --source auto

# List available sources
romdler scrape --list-sources
```

### Source Priority Override

```bash
# Try libretro first, then screenscraper
romdler scrape --source libretro,screenscraper
```

---

## References

### Source Documentation

- [Libretro Thumbnails](https://github.com/libretro-thumbnails/libretro-thumbnails) - GitHub repository
- [Libretro Thumbnail Server](https://thumbnails.libretro.com/) - Direct download CDN
- [TheGamesDB API](https://api.thegamesdb.net/) - API documentation
- [IGDB API](https://api-docs.igdb.com/) - Twitch-owned game database
- [ArcadeDB Scraper](http://adb.arcadeitalia.net/service_scraper.php) - Arcade Italia API
- [OpenVGDB](https://github.com/OpenVGDB/OpenVGDB/releases) - SQLite database releases

### Related Tools

- [Skyscraper](https://github.com/muldjord/skyscraper) - Multi-source scraper (C++)
- [Skyscraper Scraping Modules](https://gemba.github.io/skyscraper/SCRAPINGMODULES/) - Module documentation
- [RomM Metadata Providers](https://docs.romm.app/4.5.0/Getting-Started/Metadata-Providers/) - Provider comparison
- [ARRM](https://www.patreon.com/arrm/about) - Multi-source ROM manager

### Implementation References

- [bigscraper](https://github.com/Fr75s/bigscraper) - LaunchBox scraper (Python)
- [argdb_scraper](https://github.com/zach-morris/argdb_scraper) - Generalized scraper (Python)

---

## Appendix: Libretro System Names

<details>
<summary>Click to expand system name mappings</summary>

| System ID | Libretro Folder Name |
|-----------|---------------------|
| 1 | Sega - Mega Drive - Genesis |
| 2 | Sega - Master System - Mark III |
| 3 | Nintendo - Nintendo Entertainment System |
| 4 | Nintendo - Super Nintendo Entertainment System |
| 5 | Sega - Game Gear |
| 9 | Nintendo - Game Boy |
| 10 | Nintendo - Game Boy Color |
| 12 | Nintendo - Game Boy Advance |
| 14 | Nintendo - Nintendo 64 |
| 22 | Sega - Saturn |
| 23 | Sega - Dreamcast |
| 26 | Atari - 2600 |
| 27 | Atari - 7800 |
| 43 | Atari - Lynx |
| 57 | Sony - PlayStation |
| 58 | Sony - PlayStation Portable |
| 75 | MAME |
| 106 | Nintendo - Nintendo DS |
| 142 | SNK - Neo Geo |

</details>
