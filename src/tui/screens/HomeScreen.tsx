/**
 * Home screen - main TUI layout
 * Layout from TUI_TECHNICAL_OUTLINE.md:
 *
 * ┌─Run─────────────────────────────────────────────────────────────────────────┐
 * │ Command: [ Download ▼ ]   Systems: [ Game Boy ▼ ]               [ Send ]   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 * ┌─Status────────────────┐  ┌───Browse─────────────────────────────────────────┐
 * │  Running: Download... │  │            Files (w)    |    Log (q)             │
 * │  ──────────────────── │  ├──────────────────────────────────────────────────┤
 * │  Found:..........1304 │  │  ↷ file.zip skipped                             █│
 * │  Filtered:.......324  │  │  ✔ file2.zip 1.2mb                              ░│
 * │  Downloaded:.....422  │  │  ...                                            ░│
 * │  Skipped:........32   │  ├──────────────────────────────────────────────────┤
 * │  Failed:.........1    │  │  Downloading file...                             │
 * └───────────────────────┘  │  █████████░░░| 67% | 1.2MB/1.8MB | 5/20          │
 * ┌─Directory─────────────┐  └──────────────────────────────────────────────────┘
 * │ downloads/           █│
 * │  └─ Roms/            ░│
 * │    ├─ GB/            ░│
 * │    └─ SNES/          ░│
 * └───────────────────────┘
 *
 * ^c Quit   ^p Commands   ^q Log   ^w Files   f1 Help
 */

import { Box, useInput } from 'ink';
import { useState } from 'react';
import {
  Header,
  Footer,
  RunSection,
  StatusBox,
  DirectoryTree,
  BrowsePanel,
  type SelectOption,
  type LogItem,
  type FileItem,
  type TreeNode,
  type FileSortField,
  type FileSortDirection,
} from '../components/index.js';
import { useAppState, useAppDispatch } from '../store/index.js';

/** Focus areas in the UI */
type FocusArea = 'run' | 'browse' | 'directory';

/** Focus elements within RunSection */
type RunFocus = 'command' | 'system' | 'send';

/**
 * Main home screen with the full TUI layout
 */
export function HomeScreen(): React.JSX.Element {
  const state = useAppState();
  const dispatch = useAppDispatch();

  // UI state
  const [focusArea, setFocusArea] = useState<FocusArea>('run');
  const [runFocus, setRunFocus] = useState<RunFocus>('command');
  const [activeTab, setActiveTab] = useState<'files' | 'log'>('files');
  const [selectedCommand, setSelectedCommand] = useState('download');
  const [selectedSystem, setSelectedSystem] = useState('');
  const [sortField, setSortField] = useState<FileSortField>('name');
  const [sortDirection, setSortDirection] = useState<FileSortDirection>('asc');
  const [selectedDirPath, setSelectedDirPath] = useState<string>('Roms/GB');

  // Mock system options matching TUI_TECHNICAL_OUTLINE.md
  const mockSystemOptions: SelectOption[] = [
    { value: 'GB', label: 'GB' },
    { value: 'GBC', label: 'GBC' },
    { value: 'SNES', label: 'SNES' },
  ];

  // Build system options from config or use mock data
  const systemOptions: SelectOption[] =
    state.systems.length > 0
      ? state.systems.map((sys) => ({
          value: sys.name,
          label: sys.name,
        }))
      : mockSystemOptions;

  // Set default system if not set
  if (selectedSystem === '') {
    if (state.systems.length > 0) {
      const firstSystem = state.systems[0];
      if (firstSystem !== undefined) {
        setSelectedSystem(firstSystem.name);
      }
    } else {
      // Use first mock system as default
      setSelectedSystem('GB');
    }
  }

  // Mock directory structure exactly matching TUI_TECHNICAL_OUTLINE.md
  // Structure from outline:
  //   downloads/
  //    └─ Roms/
  //      ├─ GB/
  //      ├─ GBC/
  //      │ ├── deleted/
  //      │ └── Imgs/
  //      └─ SNES/
  const mockDirectoryNodes: TreeNode[] = [
    {
      name: 'Roms',
      children: [
        { name: 'GB' },
        {
          name: 'GBC',
          children: [{ name: 'deleted' }, { name: 'Imgs' }],
        },
        { name: 'SNES' },
      ],
    },
  ];

  // Build directory tree from config or use mock data
  const directoryNodes: TreeNode[] =
    state.systems.length > 0
      ? [
          {
            name: 'Roms',
            children: state.systems.map((sys) => ({
              name: sys.name,
              children: [{ name: 'Imgs' }],
            })),
          },
        ]
      : mockDirectoryNodes;

  const rootName = state.config?.downloadDir ?? 'downloads';

  // Mock log items (will be real data in Phase 2)
  const mockLogItems: LogItem[] = [
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

  // Combine real log entries with mock data
  const logItems: LogItem[] =
    state.log.length > 0
      ? state.log.map((entry) => ({
          id: entry.id,
          status: entry.status,
          message: entry.message,
          size: entry.details,
        }))
      : mockLogItems;

  // Mock file items based on selected directory path (will be real data in Phase 2)
  // Matches the directory structure from TUI_TECHNICAL_OUTLINE.md
  const mockFilesByPath: Record<string, FileItem[]> = {
    // Root Roms folder
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
    // GBC deleted folder
    'Roms/GBC/deleted': [
      { name: 'bad_dump_pokemon.zip', size: '128 KB', date: '2024-01-10' },
      { name: 'corrupted_zelda.zip', size: '64 KB', date: '2024-01-09' },
    ],
    // GBC Imgs folder - artwork
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

  // Handle directory selection
  const handleDirectorySelect = (path: string): void => {
    setSelectedDirPath(path);
    // Auto-switch to Files tab when selecting a directory
    setActiveTab('files');
  };

  // Sort file items
  const unsortedFileItems: FileItem[] = mockFilesByPath[selectedDirPath] ?? [];
  const fileItems = [...unsortedFileItems].sort((a, b) => {
    let comparison = 0;

    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'size') {
      // Parse size strings for comparison (e.g., "64 KB", "1.0 MB")
      const parseSize = (size: string | undefined): number => {
        if (size === undefined) {return 0;}
        const match = size.match(/^([\d.]+)\s*(KB|MB|GB|B)?$/i);
        if (match === null) {return 0;}
        const value = parseFloat(match[1] ?? '0');
        const unit = (match[2] ?? 'B').toUpperCase();
        const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        return value * (multipliers[unit] ?? 1);
      };
      comparison = parseSize(a.size) - parseSize(b.size);
    } else if (sortField === 'date') {
      comparison = (a.date ?? '').localeCompare(b.date ?? '');
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Handle sort field change - toggle direction if same field, reset if different
  const handleSortChange = (field: FileSortField): void => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle keyboard navigation
  useInput((input, key) => {
    // Tab to cycle focus areas: run -> browse -> directory -> run
    if (key.tab && !key.shift) {
      if (focusArea === 'run') {
        setFocusArea('browse');
      } else if (focusArea === 'browse') {
        setFocusArea('directory');
      } else {
        setFocusArea('run');
        setRunFocus('command');
      }
      return;
    }

    // Shift+Tab to cycle backwards
    if (key.tab && key.shift) {
      if (focusArea === 'run') {
        setFocusArea('directory');
      } else if (focusArea === 'browse') {
        setFocusArea('run');
        setRunFocus('send');
      } else {
        setFocusArea('browse');
      }
      return;
    }

    // P key - focus Run section
    if (input === 'p' && !key.ctrl) {
      setFocusArea('run');
      setRunFocus('command');
      return;
    }

    // D key - focus Directory section
    if (input === 'd' && !key.ctrl) {
      setFocusArea('directory');
      return;
    }

    // W key - switch to Files tab and focus browse
    if (input === 'w' && !key.ctrl) {
      setActiveTab('files');
      setFocusArea('browse');
      return;
    }

    // Q key - switch to Log tab and focus browse
    if (input === 'q' && !key.ctrl) {
      setActiveTab('log');
      setFocusArea('browse');
      return;
    }

    // Navigate within run section using arrow keys
    if (focusArea === 'run') {
      if (key.leftArrow) {
        if (runFocus === 'system') {
          setRunFocus('command');
        } else if (runFocus === 'send') {
          setRunFocus('system');
        }
      } else if (key.rightArrow) {
        if (runFocus === 'command') {
          setRunFocus('system');
        } else if (runFocus === 'system') {
          setRunFocus('send');
        }
      }
    }
  });

  // Handle send button
  const handleSend = (): void => {
    // Navigate to the appropriate screen based on command
    const screen = selectedCommand as 'download' | 'scrape' | 'dedupe' | 'purge';
    dispatch({ type: 'NAVIGATE', screen });
  };

  return (
    <Box flexDirection="column" width="100%">
      {/* Header with banner */}
      <Header />

      {/* Run section - full width */}
      <RunSection
        command={selectedCommand}
        onCommandChange={setSelectedCommand}
        systemOptions={systemOptions}
        system={selectedSystem}
        onSystemChange={setSelectedSystem}
        onSend={handleSend}
        focusedElement={focusArea === 'run' ? runFocus : null}
        sendDisabled={state.systems.length === 0 && selectedSystem === ''}
      />

      {/* Main content row */}
      <Box flexDirection="row" marginTop={1} height={18}>
        {/* Left column: Status + Directory */}
        <Box flexDirection="column" width={30} flexShrink={0}>
          <StatusBox
            status={state.taskStatus}
            command={selectedCommand}
            stats={state.stats}
            width={30}
          />

          <Box marginTop={1}>
            <DirectoryTree
              rootName={rootName}
              nodes={directoryNodes}
              width={30}
              maxRows={8}
              isFocused={focusArea === 'directory'}
              placeholder="[ Set downloadDir in config ]"
              selectedPath={selectedDirPath}
              onSelect={handleDirectorySelect}
            />
          </Box>
        </Box>

        {/* Right column: Browse panel */}
        <Box flexDirection="column" flexGrow={1} marginLeft={1} height={18}>
          <BrowsePanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            logItems={logItems}
            fileItems={fileItems}
            downloadProgress={
              state.currentProgress !== null
                ? {
                    filename: state.currentProgress.filename,
                    percentage: state.currentProgress.percentage ?? 0,
                    downloaded: formatBytes(state.currentProgress.bytesDownloaded),
                    total: formatBytes(state.currentProgress.totalBytes ?? 0),
                    speed: '-- MB/s',
                    current: state.stats.downloaded + 1,
                    total_files: state.stats.filtered,
                  }
                : null
            }
            isFocused={focusArea === 'browse'}
            maxRows={12}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </Box>
      </Box>

      {/* Footer with shortcuts */}
      <Footer
        shortcuts={[
          { key: '^c', label: 'Quit' },
          { key: 'p', label: 'Run' },
          { key: 'd', label: 'Directory' },
          { key: 'q', label: 'Log' },
          { key: 'w', label: 'Files' },
          ...(activeTab === 'files' ? [{ key: 's', label: 'Sort' }] : []),
          { key: 'Tab', label: 'Navigate' },
        ]}
      />
    </Box>
  );
}

/** Format bytes to human readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const sizeUnit = sizes[i];
  if (sizeUnit === undefined) {return `${bytes} B`;}
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizeUnit}`;
}
