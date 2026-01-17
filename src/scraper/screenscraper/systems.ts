/** ScreenScraper system definition */
export interface SystemDefinition {
  id: number;
  name: string;
  extensions: string[];
}

/** ScreenScraper system ID mappings */
export const SYSTEMS: Record<string, SystemDefinition> = {
  genesis: {
    id: 1,
    name: 'Sega Genesis / Mega Drive',
    extensions: ['.gen', '.md', '.smd', '.bin', '.zip'],
  },
  mastersystem: {
    id: 2,
    name: 'Sega Master System',
    extensions: ['.sms', '.zip'],
  },
  nes: {
    id: 3,
    name: 'Nintendo Entertainment System',
    extensions: ['.nes', '.zip'],
  },
  snes: {
    id: 4,
    name: 'Super Nintendo Entertainment System',
    extensions: ['.sfc', '.smc', '.zip'],
  },
  gamegear: {
    id: 5,
    name: 'Sega Game Gear',
    extensions: ['.gg', '.zip'],
  },
  gameboy: {
    id: 9,
    name: 'Nintendo Game Boy',
    extensions: ['.gb', '.zip'],
  },
  gbc: {
    id: 10,
    name: 'Nintendo Game Boy Color',
    extensions: ['.gbc', '.gb', '.zip'],
  },
  gba: {
    id: 12,
    name: 'Nintendo Game Boy Advance',
    extensions: ['.gba', '.zip'],
  },
  n64: {
    id: 14,
    name: 'Nintendo 64',
    extensions: ['.n64', '.v64', '.z64', '.zip'],
  },
  saturn: {
    id: 22,
    name: 'Sega Saturn',
    extensions: ['.bin', '.cue', '.iso', '.chd'],
  },
  dreamcast: {
    id: 23,
    name: 'Sega Dreamcast',
    extensions: ['.chd', '.cdi', '.gdi', '.cue'],
  },
  atari2600: {
    id: 26,
    name: 'Atari 2600',
    extensions: ['.a26', '.bin', '.zip'],
  },
  atari7800: {
    id: 27,
    name: 'Atari 7800',
    extensions: ['.a78', '.bin', '.zip'],
  },
  lynx: {
    id: 43,
    name: 'Atari Lynx',
    extensions: ['.lnx', '.zip'],
  },
  psx: {
    id: 57,
    name: 'Sony PlayStation',
    extensions: ['.bin', '.cue', '.pbp', '.chd', '.m3u', '.iso'],
  },
  psp: {
    id: 58,
    name: 'Sony PlayStation Portable',
    extensions: ['.iso', '.cso', '.pbp'],
  },
  c64: {
    id: 66,
    name: 'Commodore 64',
    extensions: ['.d64', '.g64', '.prg', '.crt', '.tap', '.t64', '.zip'],
  },
  mame: {
    id: 75,
    name: 'MAME',
    extensions: ['.zip'],
  },
  nds: {
    id: 106,
    name: 'Nintendo DS',
    extensions: ['.nds', '.zip'],
  },
  neogeo: {
    id: 142,
    name: 'SNK Neo Geo',
    extensions: ['.zip'],
  },
  pcengine: {
    id: 31,
    name: 'NEC PC Engine / TurboGrafx-16',
    extensions: ['.pce', '.zip'],
  },
  pcenginecd: {
    id: 114,
    name: 'NEC PC Engine CD / TurboGrafx-CD',
    extensions: ['.cue', '.chd', '.iso'],
  },
  segacd: {
    id: 20,
    name: 'Sega CD / Mega CD',
    extensions: ['.cue', '.chd', '.iso', '.bin'],
  },
  sega32x: {
    id: 19,
    name: 'Sega 32X',
    extensions: ['.32x', '.bin', '.zip'],
  },
  coleco: {
    id: 48,
    name: 'ColecoVision',
    extensions: ['.col', '.rom', '.zip'],
  },
  intellivision: {
    id: 115,
    name: 'Mattel Intellivision',
    extensions: ['.int', '.bin', '.rom', '.zip'],
  },
  ngpc: {
    id: 82,
    name: 'SNK Neo Geo Pocket Color',
    extensions: ['.ngc', '.ngp', '.zip'],
  },
  wonderswan: {
    id: 45,
    name: 'Bandai WonderSwan',
    extensions: ['.ws', '.zip'],
  },
  wonderswancolor: {
    id: 46,
    name: 'Bandai WonderSwan Color',
    extensions: ['.wsc', '.zip'],
  },
  virtualboy: {
    id: 11,
    name: 'Nintendo Virtual Boy',
    extensions: ['.vb', '.zip'],
  },
};

/** Get system definition by ID */
export function getSystemById(id: number): SystemDefinition | undefined {
  return Object.values(SYSTEMS).find((sys) => sys.id === id);
}

/** Get system definition by short name */
export function getSystemByName(name: string): SystemDefinition | undefined {
  return SYSTEMS[name.toLowerCase()];
}

/** Get all valid extensions for a system ID */
export function getExtensionsForSystem(systemId: number): string[] {
  const system = getSystemById(systemId);
  return system?.extensions ?? ['.zip'];
}

/** Check if a file extension is valid for a system */
export function isValidExtension(systemId: number, extension: string): boolean {
  const extensions = getExtensionsForSystem(systemId);
  return extensions.includes(extension.toLowerCase());
}
