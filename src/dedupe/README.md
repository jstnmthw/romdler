# Dedupe Module

The dedupe module identifies and removes duplicate ROM files using preference-based selection. It groups files by title, then picks the best version from each group based on configurable preferences. Removed files are moved to a `deleted/` subfolder for safe recovery.

## Usage

```bash
# Analyze and move duplicates to deleted/ folder
pnpm start -- dedupe

# Preview what would be moved (no changes)
pnpm start -- dedupe --dry-run

# Limit to first N moves
pnpm start -- dedupe --limit 5
```

## How It Works

### Algorithm

1. **Parse filenames** to extract: title, regions, and all tokens
2. **Group files by title** (aggressive grouping ignores region/modifier differences)
3. **Apply preference rules** to pick the best file from each group:
   - Fewer "avoid" tokens = better
   - Better region priority = better
   - Shorter filename = better (tiebreaker)
4. **Move non-preferred files** to `deleted/` folder

### Preference-Based Selection

Unlike simple clean/variant detection, dedupe uses configurable preferences to **always pick exactly one file** per group, even when all versions are variants.

**Selection priority:**
1. **Avoid tokens** - Files containing fewer terms from the "avoid" list win
2. **Region priority** - Files with higher-priority regions win (USA > World > Europe > Japan)
3. **Tiebreaker** - Shorter filenames win (fewer modifiers = cleaner)

## Configuration

Add a `dedupe` section to your `app.config.json`:

```json
{
  "dedupe": {
    "regions": ["USA", "World", "Europe", "Japan"],
    "avoid": [
      "Proto", "Beta", "Sample", "Demo", "Rev", "Alt",
      "Virtual Console", "Retro-Bit", "Pixel Heart",
      "Switch Online", "GameCube", "Unl", "Pirate"
    ],
    "tiebreaker": "shortest"
  }
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `regions` | `string[]` | `["USA", "World", "Europe", "Japan"]` | Region preference order (first = most preferred) |
| `avoid` | `string[]` | (see defaults) | Tokens to avoid - files containing these are less preferred |
| `tiebreaker` | `string` | `"shortest"` | How to break ties: `"shortest"` or `"alphabetical"` |

### Default Avoid List

The default avoid list includes common unwanted variants:

| Category | Examples |
|----------|----------|
| Development | `Proto`, `Beta`, `Sample`, `Demo`, `Preview`, `Promo`, `Rev`, `Alt` |
| Unofficial | `Unl`, `Pirate`, `Aftermarket` |
| Re-releases | `Virtual Console`, `Retro-Bit`, `Pixel Heart`, `RetroZone`, `Switch Online` |
| Platforms | `GameCube`, `Wii U`, `3DS`, `NSO`, `e-Reader` |
| Special editions | `iam8bit`, `Limited Run`, `Arcade Archives`, `Mini Console` |
| Mini consoles | `Genesis Mini`, `SNES Classic`, `NES Classic` |
| Compilations | `Capcom Classics`, `Namco Museum`, `Mega Man Legacy`, `Disney Classic` |

### Multi-Region Support

Dedupe correctly parses multi-region tokens like `(USA, Europe)` into separate regions:

```
8 Eyes (USA, Europe) (Pixel Heart).zip
  → regions: ["USA", "Europe"]
  → avoid matches: "Pixel Heart"
```

### Region Codes

Standard region codes are recognized:

`USA`, `Europe`, `Japan`, `World`, `Australia`, `Brazil`, `Canada`, `China`, `France`, `Germany`, `Hong Kong`, `Italy`, `Korea`, `Mexico`, `Netherlands`, `Russia`, `Spain`, `Sweden`, `Taiwan`, `UK`

## Example

### Input Files

```
8 Eyes (USA).zip                           <- KEEP (no avoid tokens, USA region)
8 Eyes (USA, Europe) (Pixel Heart).zip     <- MOVE (Pixel Heart in avoid list)
Airball (USA) (Proto 1) (Unl).zip          <- KEEP (fewest avoid tokens + shortest)
Airball (USA) (Proto 2) (Unl).zip          <- MOVE
Airball (USA) (Proto 3) (Unl).zip          <- MOVE
Airball (USA) (RetroZone) (Pirate).zip     <- MOVE (more avoid tokens)
Mega Man 4 (USA).zip                       <- KEEP (no avoid tokens)
Mega Man 4 (USA) (Rev 1).zip               <- MOVE (Rev in avoid list)
```

### Output Structure

```
downloads/roms/nes/
├── 8 Eyes (USA).zip
├── Airball (USA) (Proto 1) (Unl).zip
├── Mega Man 4 (USA).zip
└── deleted/
    ├── 8 Eyes (USA, Europe) (Pixel Heart).zip
    ├── Airball (USA) (Proto 2) (Unl).zip
    ├── Airball (USA) (Proto 3) (Unl).zip
    ├── Airball (USA) (RetroZone) (Pirate).zip
    └── Mega Man 4 (USA) (Rev 1).zip
```

### Console Output

```
Dedupe ROM Files
----------------------------------------
[DRY RUN] No files will be moved

Directory: /path/to/roms
Deleted folder: /path/to/roms/deleted
Files found: 8
Groups with duplicates: 3

8 Eyes
  ✓ 8 Eyes (USA).zip (preferred)
  x 8 Eyes (USA, Europe) (Pixel Heart).zip

Airball
  ✓ Airball (USA) (Proto 1) (Unl).zip (preferred)
  x Airball (USA) (Proto 2) (Unl).zip
  x Airball (USA) (Proto 3) (Unl).zip
  x Airball (USA) (RetroZone) (Pirate).zip

Mega Man 4
  ✓ Mega Man 4 (USA).zip (preferred)
  x Mega Man 4 (USA) (Rev 1).zip

----------------------------------------
Summary
  Scanned: 8
  Groups with duplicates: 3
  Moved:   5
  Kept:    3
```

## CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--dry-run` | `-n` | Preview mode - show what would be moved |
| `--limit <N>` | `-l <N>` | Limit to first N moves |
| `--config <path>` | `-c <path>` | Use custom config file path |

## Module Structure

```
src/dedupe/
├── index.ts      # Barrel exports
├── dedupe.ts     # Main dedupe logic
├── parser.ts     # ROM filename parsing
├── grouper.ts    # File grouping and analysis
├── selector.ts   # Preference-based selection
├── types.ts      # Type definitions
└── README.md     # This file
```

## Types

```typescript
type ParsedRomName = {
  filename: string;           // Original filename
  title: string;              // Game title
  regions: string[];          // Region codes (supports multi-region)
  qualityModifiers: string[]; // Hardware/language modifiers
  variantIndicators: string[];// Rev/Beta/Proto markers
  extraTokens: string[];      // Unrecognized tokens and bracket tags
  allTokens: string[];        // All tokens for preference matching
  isClean: boolean;           // No variant indicators AND no extra tokens
  baseSignature: string;      // Title-only grouping key
};

type DedupeRomFile = {
  path: string;               // Absolute path
  filename: string;           // Filename
  parsed: ParsedRomName;      // Parsed components
};

type RomGroup = {
  signature: string;          // Base signature (title only)
  displayTitle: string;       // Display name
  preferred: DedupeRomFile | null;  // Best version
  variants: DedupeRomFile[];  // Non-clean versions
  toRemove: DedupeRomFile[];  // Files to move
  toKeep: DedupeRomFile[];    // Files to keep
};

type DedupeResult = {
  file: DedupeRomFile;
  status: 'removed' | 'kept' | 'failed';
  error?: string;
};
```

## Base Signature

Files are grouped by their "base signature" which is the **normalized title only**:

- Lowercase
- Special characters removed
- Whitespace collapsed

Example signatures:
- `mega man 4` (all Mega Man 4 variants grouped together)
- `8 eyes` (all 8 Eyes variants grouped together)

This aggressive grouping ensures regional variants and re-releases are properly deduplicated.

## Recovery

Since files are moved to `deleted/` rather than permanently deleted, you can easily recover them:

```bash
# Restore all deleted files
mv downloads/roms/snes/deleted/* downloads/roms/snes/

# Or selectively restore
mv downloads/roms/snes/deleted/specific-file.zip downloads/roms/snes/
```

## Exit Codes

- `0` - Success (all files processed)
- `1` - Failure (at least one move failed)
