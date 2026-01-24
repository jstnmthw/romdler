import type { Command } from './args.js';

const PROGRAM_NAME = 'romdler';
const VERSION = '1.0.0';

/** Help text for the main CLI */
const MAIN_HELP = `
${PROGRAM_NAME} v${VERSION}

A CLI for downloading, organizing, and managing ROM collections.

Usage:
  pnpm cli <command> [options]

Commands:
  download    Download ROM files from configured sources
  scrape      Download cover artwork for ROM files
  purge       Remove unwanted files matching blacklist patterns
  dedupe      Remove duplicate ROMs, keeping preferred versions
  format      Format artwork for specific devices
  help        Show this help message

Global Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview actions without making changes
  -l, --limit <n>        Limit to first N items
  -h, --help             Show help for a command

Examples:
  pnpm cli download                     Download all configured ROMs
  pnpm cli download --dry-run           Preview downloads
  pnpm cli scrape --force               Re-download existing artwork
  pnpm cli dedupe --dry-run             Preview deduplication
  pnpm cli format                       Format artwork with config settings
  pnpm cli help download                Show help for download command

Configuration:
  Create an app.config.json file in the project root.
  See app.config.example.json for reference.
`.trim();

/** Help text for the download command */
const DOWNLOAD_HELP = `
${PROGRAM_NAME} download

Download ROM files from configured HTML directory listings.

Usage:
  pnpm cli download [options]

Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview files without downloading
  -l, --limit <n>        Download only first N files per system
  -h, --help             Show this help message

Configuration (app.config.json):
  downloadDir            Base directory for downloads
  systems[]              Array of system configurations
    - url                URL to HTML directory listing
    - downloadDir        Override download directory for this system
    - tableId            HTML table ID to parse (optional)
    - whitelist[]        Only download files matching these patterns
    - blacklist[]        Skip files matching these patterns
  concurrency            Parallel downloads (1-10, default: 1)
  userAgent              HTTP User-Agent header
  requestTimeoutMs       Request timeout in milliseconds
  retries                Number of retry attempts

Examples:
  pnpm cli download                     Download all configured systems
  pnpm cli download --dry-run           Preview what would be downloaded
  pnpm cli download --limit 5           Download first 5 files per system
  pnpm cli download -c custom.json      Use custom config file
`.trim();

/** Help text for the scrape command */
const SCRAPE_HELP = `
${PROGRAM_NAME} scrape

Download cover artwork for ROM files using configured adapters.

Usage:
  pnpm cli scrape [options]

Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview artwork lookups without downloading
  -l, --limit <n>        Process only first N ROMs per system
  -f, --force            Re-download existing artwork (overwrite)
  -m, --media <type>     Media type: box-2D, ss, sstitle (default: box-2D)
  -r, --region <list>    Region priority, comma-separated (e.g., us,eu,jp)
  -h, --help             Show this help message

Adapters:
  libretro               Filename-based lookup from Libretro Thumbnails
  screenscraper          CRC32 hash-based lookup from ScreenScraper.fr

Configuration (app.config.json):
  scraper.adapter        Adapter name: "libretro" or "screenscraper"
  scraper.outputDir      Where to save artwork (default: same as ROM)
  scraper.mediaType      Default media type
  scraper.regionPriority Default region priority list
  scraper.credentials    ScreenScraper API credentials (if using)
    - devId              Developer ID
    - devPassword        Developer password
    - username           User account name
    - password           User account password

Examples:
  pnpm cli scrape                       Scrape artwork for all ROMs
  pnpm cli scrape --dry-run             Preview without downloading
  pnpm cli scrape --force               Re-download existing artwork
  pnpm cli scrape --media ss            Download screenshots instead
  pnpm cli scrape --region us,eu,wor    Set region priority
`.trim();

/** Help text for the purge command */
const PURGE_HELP = `
${PROGRAM_NAME} purge

Remove unwanted files matching blacklist patterns from download directories.

Usage:
  pnpm cli purge [options]

Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview files to delete without removing
  -l, --limit <n>        Delete only first N matched files per system
  -h, --help             Show this help message

Configuration (app.config.json):
  systems[].blacklist    Array of patterns to match for deletion
                         Supports glob patterns (*, **, ?)

Pattern Examples:
  "*Demo*"               Match filenames containing "Demo"
  "*(Beta)*"             Match beta releases
  "*(Proto)*"            Match prototypes
  "*[b]*"                Match bad dumps (common ROM naming)

Examples:
  pnpm cli purge                        Delete all blacklisted files
  pnpm cli purge --dry-run              Preview what would be deleted
  pnpm cli purge --limit 10             Delete first 10 matches per system
`.trim();

/** Help text for the dedupe command */
const DEDUPE_HELP = `
${PROGRAM_NAME} dedupe

Remove duplicate ROMs, keeping preferred versions based on region priority.

Usage:
  pnpm cli dedupe [options]

Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview duplicates without removing
  -l, --limit <n>        Process only first N duplicate groups
  -h, --help             Show this help message

Configuration (app.config.json):
  scraper.regionPriority   Region preference order (e.g., ["USA", "Europe"])
  systems[].downloadDir    Directories to scan for duplicates

Deduplication Logic:
  1. Parse ROM filenames to extract title and tags
  2. Group ROMs by normalized title
  3. Within each group, select preferred version based on:
     - Region priority (USA > Europe > Japan by default)
     - Revision number (higher is better)
     - Flags (!p for verified, etc.)
  4. Remove non-preferred duplicates

Examples:
  pnpm cli dedupe                       Dedupe all configured systems
  pnpm cli dedupe --dry-run             Preview duplicates to remove
  pnpm cli dedupe --limit 5             Process first 5 duplicate groups
`.trim();

/** Help text for the format command */
const FORMAT_HELP = `
${PROGRAM_NAME} format

Format artwork images with custom canvas size and alignment.

Usage:
  pnpm cli format [options]

Options:
  -c, --config <path>    Path to config file (default: app.config.json)
  -n, --dry-run          Preview files without processing
  -l, --limit <n>        Process only first N images per system
  -f, --force            Overwrite existing formatted images
  -h, --help             Show this help message

Configuration (app.config.json):
  format.canvasWidth     Output canvas width in pixels (default: 640)
  format.canvasHeight    Output canvas height in pixels (default: 480)
  format.resizeMaxWidth  Max artwork width before compositing (default: 320)
  format.resizeMaxHeight Max artwork height before compositing (default: 320)
  format.gravity         Alignment: east, west, center, north, south (default: east)
  format.padding         Padding from edge in pixels (default: 0)
  format.outputFolder    Subfolder in Imgs/ for output (default: Formatted)

Processing:
  1. Scan Imgs/ directory for PNG/JPG images
  2. Resize each image to fit within max dimensions
  3. Create transparent canvas at specified size
  4. Composite resized image with specified gravity
  5. Save to Imgs/<outputFolder>/ subdirectory

Examples:
  pnpm cli format                       Format with config settings
  pnpm cli format --dry-run             Preview what would be processed
  pnpm cli format --force               Overwrite existing formatted images
  pnpm cli format --limit 5             Format first 5 images per system

Example Config:
  {
    "format": {
      "canvasWidth": 640,
      "canvasHeight": 480,
      "resizeMaxWidth": 320,
      "resizeMaxHeight": 320,
      "gravity": "west",
      "padding": 20,
      "outputFolder": "RG35XX"
    }
  }
`.trim();

/** Help text for the help command */
const HELP_HELP = `
${PROGRAM_NAME} help

Show help for the CLI or a specific command.

Usage:
  pnpm cli help [command]

Arguments:
  command    Command to show help for (optional)

Available Commands:
  download   Download ROM files from configured sources
  scrape     Download cover artwork for ROM files
  purge      Remove unwanted files matching blacklist patterns
  dedupe     Remove duplicate ROMs, keeping preferred versions
  format     Format artwork for specific devices

Examples:
  pnpm cli help                         Show main help
  pnpm cli help download                Show download command help
  pnpm cli download --help              Same as above
`.trim();

/** Map of command names to their help text */
const COMMAND_HELP: Record<Command, string> = {
  download: DOWNLOAD_HELP,
  scrape: SCRAPE_HELP,
  purge: PURGE_HELP,
  dedupe: DEDUPE_HELP,
  format: FORMAT_HELP,
  help: HELP_HELP,
};

/**
 * Get help text for the CLI or a specific command.
 * @param command - Optional command to show help for
 * @returns Formatted help text string
 */
export function getHelpText(command?: Command): string {
  if (command === undefined || command === 'help') {
    return MAIN_HELP;
  }
  return COMMAND_HELP[command];
}

/**
 * Get the brief usage message shown when no command is provided.
 * @returns Brief usage string
 */
export function getUsageText(): string {
  return `
Usage: pnpm cli <command> [options]

Commands: download, scrape, purge, dedupe, format

Run 'pnpm cli help' for more information.
Run 'pnpm cli <command> --help' for command-specific help.
`.trim();
}
