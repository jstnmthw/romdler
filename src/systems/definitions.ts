/**
 * System definitions - edit this file to add or modify systems.
 *
 * Each entry maps a shortcode to system metadata:
 * - name: Human-readable name (used for display)
 * - systemId: ScreenScraper/Libretro system ID (used for artwork lookup)
 * - extensions: Valid ROM file extensions
 *
 * Shortcodes should be lowercase and match common conventions.
 * Multiple shortcodes can map to the same system (aliases).
 */

export type SystemDefinition = {
  name: string;
  systemId: number;
  extensions: string[];
};

/**
 * Built-in system definitions.
 * Organized by manufacturer/category for easier maintenance.
 */
export const SYSTEM_DEFINITIONS: Record<string, SystemDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NINTENDO - Handhelds
  // ═══════════════════════════════════════════════════════════════════════════
  gb: {
    name: 'Nintendo - Game Boy',
    systemId: 9,
    extensions: ['.gb', '.zip'],
  },
  gbc: {
    name: 'Nintendo - Game Boy Color',
    systemId: 10,
    extensions: ['.gbc', '.gb', '.zip'],
  },
  gba: {
    name: 'Nintendo - Game Boy Advance',
    systemId: 12,
    extensions: ['.gba', '.zip'],
  },
  nds: {
    name: 'Nintendo - DS',
    systemId: 15,
    extensions: ['.nds', '.zip'],
  },
  vb: {
    name: 'Nintendo - Virtual Boy',
    systemId: 11,
    extensions: ['.vb', '.zip'],
  },
  gw: {
    name: 'Nintendo - Game & Watch',
    systemId: 52,
    extensions: ['.mgw', '.zip'],
  },
  poke: {
    name: 'Nintendo - Pokemon Mini',
    systemId: 211,
    extensions: ['.min', '.zip'],
  },
  pokemini: {
    name: 'Nintendo - Pokemon Mini',
    systemId: 211,
    extensions: ['.min', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NINTENDO - Consoles
  // ═══════════════════════════════════════════════════════════════════════════
  nes: {
    name: 'Nintendo - NES',
    systemId: 3,
    extensions: ['.nes', '.zip'],
  },
  fc: {
    name: 'Nintendo - NES',
    systemId: 3,
    extensions: ['.nes', '.zip'],
  },
  fds: {
    name: 'Nintendo - Famicom Disk System',
    systemId: 106,
    extensions: ['.fds', '.zip'],
  },
  snes: {
    name: 'Nintendo - SNES',
    systemId: 4,
    extensions: ['.sfc', '.smc', '.zip'],
  },
  sfc: {
    name: 'Nintendo - SNES',
    systemId: 4,
    extensions: ['.sfc', '.smc', '.zip'],
  },
  n64: {
    name: 'Nintendo - N64',
    systemId: 14,
    extensions: ['.n64', '.v64', '.z64', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGA - Handhelds
  // ═══════════════════════════════════════════════════════════════════════════
  gg: {
    name: 'Sega - Game Gear',
    systemId: 5,
    extensions: ['.gg', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEGA - Consoles
  // ═══════════════════════════════════════════════════════════════════════════
  sms: {
    name: 'Sega - Master System',
    systemId: 2,
    extensions: ['.sms', '.zip'],
  },
  md: {
    name: 'Sega - Mega Drive / Genesis',
    systemId: 1,
    extensions: ['.gen', '.md', '.smd', '.bin', '.zip'],
  },
  genesis: {
    name: 'Sega - Mega Drive / Genesis',
    systemId: 1,
    extensions: ['.gen', '.md', '.smd', '.bin', '.zip'],
  },
  mdcd: {
    name: 'Sega - Mega CD',
    systemId: 20,
    extensions: ['.cue', '.chd', '.iso', '.bin'],
  },
  scd: {
    name: 'Sega - Mega CD',
    systemId: 20,
    extensions: ['.cue', '.chd', '.iso', '.bin'],
  },
  segacd: {
    name: 'Sega - Mega CD',
    systemId: 20,
    extensions: ['.cue', '.chd', '.iso', '.bin'],
  },
  '32x': {
    name: 'Sega - 32X',
    systemId: 19,
    extensions: ['.32x', '.bin', '.zip'],
  },
  saturn: {
    name: 'Sega - Saturn',
    systemId: 22,
    extensions: ['.bin', '.cue', '.iso', '.chd'],
  },
  dreamcast: {
    name: 'Sega - Dreamcast',
    systemId: 23,
    extensions: ['.chd', '.cdi', '.gdi', '.cue'],
  },
  dc: {
    name: 'Sega - Dreamcast',
    systemId: 23,
    extensions: ['.chd', '.cdi', '.gdi', '.cue'],
  },
  pico: {
    name: 'Sega - PICO',
    systemId: 234,
    extensions: ['.bin', '.md', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SONY
  // ═══════════════════════════════════════════════════════════════════════════
  ps: {
    name: 'Sony - PlayStation',
    systemId: 57,
    extensions: ['.bin', '.cue', '.pbp', '.chd', '.m3u', '.iso'],
  },
  psx: {
    name: 'Sony - PlayStation',
    systemId: 57,
    extensions: ['.bin', '.cue', '.pbp', '.chd', '.m3u', '.iso'],
  },
  ps1: {
    name: 'Sony - PlayStation',
    systemId: 57,
    extensions: ['.bin', '.cue', '.pbp', '.chd', '.m3u', '.iso'],
  },
  psp: {
    name: 'Sony - PSP',
    systemId: 58,
    extensions: ['.iso', '.cso', '.pbp'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEC
  // ═══════════════════════════════════════════════════════════════════════════
  pce: {
    name: 'NEC - PC Engine / TurboGrafx-16',
    systemId: 31,
    extensions: ['.pce', '.zip'],
  },
  tg16: {
    name: 'NEC - PC Engine / TurboGrafx-16',
    systemId: 31,
    extensions: ['.pce', '.zip'],
  },
  pcecd: {
    name: 'NEC - PC Engine CD',
    systemId: 114,
    extensions: ['.cue', '.chd', '.iso'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SNK
  // ═══════════════════════════════════════════════════════════════════════════
  neogeo: {
    name: 'SNK - Neo Geo',
    systemId: 142,
    extensions: ['.zip'],
  },
  ngp: {
    name: 'SNK - Neo Geo Pocket / Color',
    systemId: 82,
    extensions: ['.ngp', '.ngc', '.zip'],
  },
  ngpc: {
    name: 'SNK - Neo Geo Pocket Color',
    systemId: 82,
    extensions: ['.ngc', '.ngp', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ATARI
  // ═══════════════════════════════════════════════════════════════════════════
  atari: {
    name: 'Atari - 2600',
    systemId: 26,
    extensions: ['.a26', '.bin', '.zip'],
  },
  '2600': {
    name: 'Atari - 2600',
    systemId: 26,
    extensions: ['.a26', '.bin', '.zip'],
  },
  a5200: {
    name: 'Atari - 5200',
    systemId: 40,
    extensions: ['.a52', '.bin', '.zip'],
  },
  '5200': {
    name: 'Atari - 5200',
    systemId: 40,
    extensions: ['.a52', '.bin', '.zip'],
  },
  a7800: {
    name: 'Atari - 7800',
    systemId: 41,
    extensions: ['.a78', '.bin', '.zip'],
  },
  '7800': {
    name: 'Atari - 7800',
    systemId: 41,
    extensions: ['.a78', '.bin', '.zip'],
  },
  a800: {
    name: 'Atari - 800 / 8-bit',
    systemId: 43,
    extensions: ['.atr', '.xex', '.xfd', '.zip'],
  },
  lynx: {
    name: 'Atari - Lynx',
    systemId: 28,
    extensions: ['.lnx', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BANDAI
  // ═══════════════════════════════════════════════════════════════════════════
  ws: {
    name: 'Bandai - WonderSwan / Color',
    systemId: 45,
    extensions: ['.ws', '.wsc', '.zip'],
  },
  wsc: {
    name: 'Bandai - WonderSwan Color',
    systemId: 46,
    extensions: ['.wsc', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCADE
  // ═══════════════════════════════════════════════════════════════════════════
  mame: {
    name: 'MAME',
    systemId: 75,
    extensions: ['.zip'],
  },
  arcade: {
    name: 'MAME',
    systemId: 75,
    extensions: ['.zip'],
  },
  fbneo: {
    name: 'FinalBurn Neo',
    systemId: 75,
    extensions: ['.zip'],
  },
  hbmame: {
    name: 'HBMAME',
    systemId: 75,
    extensions: ['.zip'],
  },
  cps1: {
    name: 'Capcom - CPS1',
    systemId: 65,
    extensions: ['.zip'],
  },
  cps2: {
    name: 'Capcom - CPS2',
    systemId: 66,
    extensions: ['.zip'],
  },
  cps3: {
    name: 'Capcom - CPS3',
    systemId: 67,
    extensions: ['.zip'],
  },
  naomi: {
    name: 'Sega - NAOMI',
    systemId: 56,
    extensions: ['.zip', '.chd'],
  },
  atomiswave: {
    name: 'Sammy - Atomiswave',
    systemId: 53,
    extensions: ['.zip', '.chd'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTERS
  // ═══════════════════════════════════════════════════════════════════════════
  dos: {
    name: 'Microsoft - DOS',
    systemId: 135,
    extensions: ['.zip', '.exe', '.com'],
  },
  msx: {
    name: 'Microsoft - MSX / MSX2',
    systemId: 113,
    extensions: ['.rom', '.mx1', '.mx2', '.dsk', '.zip'],
  },
  c64: {
    name: 'Commodore - 64',
    systemId: 66,
    extensions: ['.d64', '.g64', '.prg', '.crt', '.tap', '.t64', '.zip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER
  // ═══════════════════════════════════════════════════════════════════════════
  coleco: {
    name: 'Coleco - ColecoVision',
    systemId: 48,
    extensions: ['.col', '.rom', '.zip'],
  },
  intv: {
    name: 'Mattel - Intellivision',
    systemId: 115,
    extensions: ['.int', '.bin', '.rom', '.zip'],
  },
  easyrpg: {
    name: 'EasyRPG',
    systemId: 231,
    extensions: ['.ldb', '.zip'],
  },
  openbor: {
    name: 'OpenBOR',
    systemId: 214,
    extensions: ['.pak'],
  },
};
