# Dedupe Module

The dedupe module identifies and removes duplicate ROM files, keeping only the "clean" original version when duplicates exist. Removed files are moved to a `deleted/` subfolder for safe recovery.

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

1. **Parse filenames** to extract: title, regions, quality modifiers, variant indicators, extra tokens
2. **Group files** by base signature (title + region + quality modifiers)
3. **Identify clean versions** - files with NO variant indicators AND NO extra tokens
4. **Prefer purest version** - files ending with just region tags like `(USA).zip` are preferred
5. **Move variants** to `deleted/` only when a clean version exists in the group
6. **Keep all files** if only variant versions exist (nothing to prefer)

### Clean File Detection

A file is considered "clean" (the canonical original) when it has:
- **No variant indicators** (Rev, Beta, Proto, etc.)
- **No extra/unrecognized tokens** (unknown parenthetical tags)
- **No bracket tokens** (`[b]`, `[h]`, `[!]`, etc.)

This means `Game (USA).zip` is preferred over `Game (USA) (Unknown Tag).zip`.

### Variant Indicators

These markers identify non-canonical versions that should be removed when a clean version exists:

| Category | Examples |
|----------|----------|
| Development | `(Rev X)`, `(Beta)`, `(Proto)`, `(Sample)`, `(Demo)`, `(Preview)`, `(Promo)` |
| Dated builds | `(YYYY-MM-DD)`, `(YYYY.MM.DD)` |
| Re-releases | `(Virtual Console)`, `(GameCube)`, `(Switch Online)`, `(3DS Virtual Console)`, `(Wii U Virtual Console)`, `(NSO)` |
| Special editions | `(iam8bit)`, `(Retro-Bit)`, `(Retro-Bit Generations)`, `(Limited Run)`, `(Arcade Archives)` |
| Compilations | `(Capcom Classics Mini Mix)`, `(Namco Museum)`, `(Mega Man Legacy Collection)` |
| Mini consoles | `(Genesis Mini)`, `(SNES Classic)`, `(NES Classic)`, `(Classic NES Series)`, `(Famicom Mini)` |

### Extra Tokens (Bracket Tags)

ROM status indicators in square brackets are tracked as "extra tokens" and make a file less preferred:

| Token | Meaning |
|-------|---------|
| `[!]` | Verified good dump |
| `[b]` | Bad dump |
| `[h]` | Hack |
| `[o]` | Overdump |
| `[a]` | Alternate |
| `[t]` | Trained |
| `[f]` | Fixed |
| `[p]` | Pirate |

Any unrecognized parenthetical token (e.g., `(Unknown)`) is also tracked as an extra token.

### Quality Modifiers

These markers are preserved as part of the file's identity (different modifiers = different files):

| Category | Examples |
|----------|----------|
| Hardware features | `(SGB Enhanced)`, `(GB Compatible)`, `(Rumble Version)` |
| Language codes | `(En,Fr,De)`, `(Ja)`, `(Es)` |
| Distribution | `(Unl)`, `(Pirate)`, `(Aftermarket)` |
| Enhancement chips | `(SA-1)`, `(DSP-1)`, `(SuperFX)` |

### Region Codes

Standard region codes are recognized and used for grouping:

`USA`, `Europe`, `Japan`, `World`, `Australia`, `Brazil`, `Canada`, `China`, `France`, `Germany`, `Hong Kong`, `Italy`, `Korea`, `Mexico`, `Netherlands`, `Russia`, `Spain`, `Sweden`, `Taiwan`, `UK`

## Example

### Input Files

```
Mega Man 4 (USA).zip                        <- KEEP (clean - only region)
Mega Man 4 (USA) (Rev 1).zip                <- MOVE (variant indicator)
Mega Man 4 (USA) (Beta).zip                 <- MOVE (variant indicator)
Mega Man 4 (USA) (Retro-Bit Generations).zip <- MOVE (compilation variant)
Sonic (USA) (Beta).zip                      <- KEEP (no clean version exists)
Zelda (USA) (SGB Enhanced).zip              <- KEEP (clean with quality modifier)
Zelda (USA) (Rev 2) (SGB Enhanced).zip      <- MOVE (variant)
Bionic Commando (USA).zip                   <- KEEP (clean)
Bionic Commando (USA) (Capcom Classics) [b].zip <- MOVE (variant + bracket tag)
```

### Output Structure

```
downloads/roms/snes/
├── Mega Man 4 (USA).zip
├── Sonic (USA) (Beta).zip
├── Zelda (USA) (SGB Enhanced).zip
├── Bionic Commando (USA).zip
└── deleted/
    ├── Mega Man 4 (USA) (Rev 1).zip
    ├── Mega Man 4 (USA) (Beta).zip
    ├── Mega Man 4 (USA) (Retro-Bit Generations).zip
    ├── Zelda (USA) (Rev 2) (SGB Enhanced).zip
    └── Bionic Commando (USA) (Capcom Classics) [b].zip
```

### Console Output

```
Dedupe ROM Files
----------------------------------------
[DRY RUN] No files will be moved

Directory: /path/to/roms
Deleted folder: /path/to/roms/deleted
Files found: 6
Groups with duplicates: 2

Mega Man 4 (USA)
  ✓ Mega Man 4 (USA).zip (preferred)
  x Mega Man 4 (USA) (Rev 1).zip
  x Mega Man 4 (USA) (Beta).zip

Legend of Zelda, The (USA)
  ✓ Zelda (USA) (SGB Enhanced).zip (preferred)
  x Zelda (USA) (Rev 2) (SGB Enhanced).zip

----------------------------------------
Summary
  Scanned: 6
  Groups with duplicates: 2
  Moved:   3
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
├── types.ts      # Type definitions
└── README.md     # This file
```

## Types

```typescript
type ParsedRomName = {
  filename: string;           // Original filename
  title: string;              // Game title
  regions: string[];          // Region codes
  qualityModifiers: string[]; // Hardware/language modifiers
  variantIndicators: string[];// Rev/Beta/Proto markers
  extraTokens: string[];      // Unrecognized tokens and bracket tags
  isClean: boolean;           // No variant indicators AND no extra tokens
  baseSignature: string;      // Grouping key
};

type DedupeRomFile = {
  path: string;               // Absolute path
  filename: string;           // Filename
  parsed: ParsedRomName;      // Parsed components
};

type RomGroup = {
  signature: string;          // Base signature
  displayTitle: string;       // Display name
  preferred: DedupeRomFile | null;  // Clean version
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

Files are grouped by their "base signature" which combines:

1. **Normalized title** - lowercase, special chars removed
2. **Sorted regions** - e.g., `usa,europe`
3. **Sorted quality modifiers** - e.g., `gb compatible,sgb enhanced`

Example signatures:
- `mega man 4|usa|` (clean USA version)
- `zelda|usa|sgb enhanced` (USA with SGB Enhanced)

Files with identical signatures are considered duplicates.

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
