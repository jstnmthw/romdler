/**
 * Mock data for TUI development and testing
 * This file contains placeholder data that will be replaced with real data in Phase 2
 *
 * To switch to real data:
 * 1. Create data providers that fetch/compute actual data
 * 2. Update HomeScreen.tsx to use providers instead of these constants
 * 3. This file can be removed or kept for testing/demo purposes
 */

import type { SelectOption, LogItem, FileItem, TreeNode } from '../components/index.js';

// ============================================================================
// System Options
// ============================================================================

/** Mock system options matching TUI_TECHNICAL_OUTLINE.md */
export const MOCK_SYSTEM_OPTIONS: SelectOption[] = [
  { value: 'GB', label: 'GB' },
  { value: 'GBC', label: 'GBC' },
  { value: 'SNES', label: 'SNES' },
];

/** Default system to select when no config is loaded */
export const MOCK_DEFAULT_SYSTEM = 'GB';

// ============================================================================
// Directory Structure
// ============================================================================

/** Mock directory structure from TUI_TECHNICAL_OUTLINE.md */
export const MOCK_DIRECTORY_NODES: TreeNode[] = [
  {
    name: 'Roms',
    children: [
      { name: 'GB' },
      { name: 'GBC', children: [{ name: 'deleted' }, { name: 'Imgs' }] },
      { name: 'SNES' },
    ],
  },
];

/** Default directory path to select */
export const MOCK_DEFAULT_DIR_PATH = 'Roms/GB';

/** Default root directory name */
export const MOCK_ROOT_NAME = 'downloads';

// ============================================================================
// Log Items
// ============================================================================

/** Mock log items showing various statuses */
export const MOCK_LOG_ITEMS: LogItem[] = [
  { id: '1', status: 'downloaded', message: 'Super Mario Land (World).zip', size: '64 KB' },
  { id: '2', status: 'downloaded', message: 'Pokemon Red (USA, Europe).zip', size: '1.0 MB' },
  { id: '3', status: 'skipped', message: 'Tetris (World) (Rev A).zip' },
  { id: '4', status: 'downloaded', message: 'Legend of Zelda, The - Links Awakening (USA).zip', size: '512 KB' },
  { id: '5', status: 'failed', message: 'Metroid II - Return of Samus (World).zip' },
  { id: '6', status: 'downloaded', message: 'Kirby Dream Land (USA, Europe).zip', size: '256 KB' },
  { id: '7', status: 'skipped', message: 'Dr. Mario (World).zip' },
  { id: '8', status: 'downloaded', message: 'Donkey Kong (World) (Rev A).zip', size: '32 KB' },
  { id: '9', status: 'info', message: 'Scanning directory...' },
  { id: '10', status: 'downloaded', message: 'Final Fantasy Adventure (USA).zip', size: '256 KB' },
  { id: '11', status: 'downloaded', message: 'Mega Man - Dr. Wilys Revenge (USA).zip', size: '128 KB' },
  { id: '12', status: 'skipped', message: 'Castlevania - The Adventure (USA, Europe).zip' },
];

// ============================================================================
// File Items by Directory Path
// ============================================================================

/** Mock file items organized by directory path */
export const MOCK_FILES_BY_PATH: Record<string, FileItem[]> = {
  // Root Roms folder (empty - just contains subfolders)
  Roms: [],

  // GB system - ROMs
  'Roms/GB': [
    { name: 'Super Mario Land (World).zip', size: '64 KB', date: '2024-01-15' },
    { name: 'Pokemon Red (USA, Europe).zip', size: '1.0 MB', date: '2024-01-14' },
    { name: 'Tetris (World) (Rev A).zip', size: '32 KB', date: '2024-01-13' },
    { name: 'Legend of Zelda, The - Links Awakening (USA).zip', size: '512 KB', date: '2024-01-12' },
    { name: 'Kirby Dream Land (USA, Europe).zip', size: '256 KB', date: '2024-01-11' },
    { name: 'Metroid II - Return of Samus (World).zip', size: '256 KB', date: '2024-01-10' },
    { name: 'Donkey Kong (World) (Rev A).zip', size: '32 KB', date: '2024-01-09' },
    { name: 'Final Fantasy Adventure (USA).zip', size: '256 KB', date: '2024-01-08' },
  ],

  // GBC system - ROMs
  'Roms/GBC': [
    { name: 'Pokemon Crystal (USA, Europe).zip', size: '2.0 MB', date: '2024-01-15' },
    { name: 'Pokemon Gold (USA, Europe).zip', size: '2.0 MB', date: '2024-01-14' },
    { name: 'Legend of Zelda, The - Oracle of Ages (USA).zip', size: '1.0 MB', date: '2024-01-13' },
    { name: 'Legend of Zelda, The - Oracle of Seasons (USA).zip', size: '1.0 MB', date: '2024-01-12' },
    { name: 'Dragon Quest III (Japan).zip', size: '1.5 MB', date: '2024-01-11' },
  ],

  // GBC deleted folder - bad dumps / removed files
  'Roms/GBC/deleted': [
    { name: 'bad_dump_pokemon.zip', size: '128 KB', date: '2024-01-10' },
    { name: 'corrupted_zelda.zip', size: '64 KB', date: '2024-01-09' },
  ],

  // GBC Imgs folder - artwork/covers
  'Roms/GBC/Imgs': [
    { name: 'Pokemon Crystal.png', size: '48 KB', date: '2024-01-15' },
    { name: 'Pokemon Gold.png', size: '45 KB', date: '2024-01-14' },
    { name: 'Oracle of Ages.png', size: '52 KB', date: '2024-01-13' },
    { name: 'Oracle of Seasons.png', size: '51 KB', date: '2024-01-12' },
  ],

  // SNES system - ROMs
  'Roms/SNES': [
    { name: 'Super Mario World (USA).zip', size: '512 KB', date: '2024-01-15' },
    { name: 'Legend of Zelda, The - A Link to the Past (USA).zip', size: '1.0 MB', date: '2024-01-14' },
    { name: 'Super Metroid (Japan, USA) (En,Ja).zip', size: '3.0 MB', date: '2024-01-13' },
    { name: 'Chrono Trigger (USA).zip', size: '4.0 MB', date: '2024-01-12' },
    { name: 'Final Fantasy III (USA).zip', size: '3.0 MB', date: '2024-01-11' },
    { name: 'Donkey Kong Country (USA) (Rev A).zip', size: '4.0 MB', date: '2024-01-10' },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get files for a given directory path
 * @param path - Directory path (e.g., 'Roms/GB')
 * @returns Array of file items, empty array if path not found
 */
export function getMockFiles(path: string): FileItem[] {
  return MOCK_FILES_BY_PATH[path] ?? [];
}
