/**
 * Libretro Thumbnails system folder names.
 * Maps ScreenScraper system IDs to Libretro thumbnail folder names.
 *
 * Reference: https://github.com/libretro-thumbnails/libretro-thumbnails
 */

/** Mapping of ScreenScraper system ID to Libretro folder name */
export const LIBRETRO_SYSTEMS: Record<number, string> = {
  // Sega
  1: 'Sega - Mega Drive - Genesis',
  2: 'Sega - Master System - Mark III',
  5: 'Sega - Game Gear',
  19: 'Sega - 32X',
  20: 'Sega - Mega-CD - Sega CD',
  22: 'Sega - Saturn',
  23: 'Sega - Dreamcast',

  // Nintendo
  3: 'Nintendo - Nintendo Entertainment System',
  4: 'Nintendo - Super Nintendo Entertainment System',
  9: 'Nintendo - Game Boy',
  10: 'Nintendo - Game Boy Color',
  11: 'Nintendo - Virtual Boy',
  12: 'Nintendo - Game Boy Advance',
  14: 'Nintendo - Nintendo 64',
  106: 'Nintendo - Nintendo DS',

  // Sony
  57: 'Sony - PlayStation',
  58: 'Sony - PlayStation Portable',

  // Atari
  26: 'Atari - 2600',
  27: 'Atari - 7800',
  43: 'Atari - Lynx',

  // NEC
  31: 'NEC - PC Engine - TurboGrafx 16',
  114: 'NEC - PC Engine CD - TurboGrafx-CD',

  // SNK
  82: 'SNK - Neo Geo Pocket Color',
  142: 'SNK - Neo Geo',

  // Other
  48: 'Coleco - ColecoVision',
  66: 'Commodore - 64',
  75: 'MAME',
  115: 'Mattel - Intellivision',
  45: 'Bandai - WonderSwan',
  46: 'Bandai - WonderSwan Color',
};

/** All system IDs supported by Libretro adapter */
export const SUPPORTED_SYSTEM_IDS = Object.keys(LIBRETRO_SYSTEMS).map(Number);

/**
 * Get Libretro folder name for a ScreenScraper system ID
 * @param systemId ScreenScraper system ID
 * @returns Libretro folder name or undefined if not supported
 */
export function getLibretroSystemName(systemId: number): string | undefined {
  return LIBRETRO_SYSTEMS[systemId];
}

/**
 * Check if a system ID is supported by Libretro thumbnails
 * @param systemId ScreenScraper system ID
 */
export function isSystemSupported(systemId: number): boolean {
  return systemId in LIBRETRO_SYSTEMS;
}
