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
import {
  MOCK_SYSTEM_OPTIONS,
  MOCK_DEFAULT_SYSTEM,
  MOCK_DIRECTORY_NODES,
  MOCK_DEFAULT_DIR_PATH,
  MOCK_ROOT_NAME,
  MOCK_LOG_ITEMS,
  MOCK_FILES_BY_PATH,
} from '../mock/index.js';
import { cycleValue, getHorizontalNav } from '../hooks/index.js';

/** Focus areas in the UI */
type FocusArea = 'run' | 'browse' | 'directory';

/** Focus elements within RunSection */
type RunFocus = 'command' | 'system' | 'send';

/** Parse size string to bytes for comparison */
function parseSize(size: string | undefined): number {
  if (size === undefined) {return 0;}
  const match = size.match(/^([\d.]+)\s*(KB|MB|GB|B)?$/i);
  if (match === null) {return 0;}
  const value = parseFloat(match[1] ?? '0');
  const unit = (match[2] ?? 'B').toUpperCase();
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  return value * (multipliers[unit] ?? 1);
}

/** Compare two file items by the given field */
function compareFileItems(a: FileItem, b: FileItem, field: FileSortField): number {
  if (field === 'name') {return a.name.localeCompare(b.name);}
  if (field === 'size') {return parseSize(a.size) - parseSize(b.size);}
  if (field === 'date') {return (a.date ?? '').localeCompare(b.date ?? '');}
  return 0;
}

/** Focus area order for Tab cycling */
const FOCUS_AREAS: readonly FocusArea[] = ['run', 'browse', 'directory'];

/** Run section focus order */
const RUN_FOCUS_ORDER: readonly RunFocus[] = ['command', 'system', 'send'];

/**
 * Main home screen with the full TUI layout.
 * Complexity is inherent to orchestrating multiple panels (Run, Status, Directory, Browse)
 * with focus management, keyboard navigation, and state coordination.
 */
// eslint-disable-next-line complexity
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
  const [selectedDirPath, setSelectedDirPath] = useState<string>(MOCK_DEFAULT_DIR_PATH);

  // Build system options from config or use mock data
  const systemOptions: SelectOption[] =
    state.systems.length > 0
      ? state.systems.map((sys) => ({ value: sys.name, label: sys.name }))
      : MOCK_SYSTEM_OPTIONS;

  // Set default system if not set
  if (selectedSystem === '') {
    if (state.systems.length > 0) {
      const firstSystem = state.systems[0];
      if (firstSystem !== undefined) {
        setSelectedSystem(firstSystem.name);
      }
    } else {
      // Use first mock system as default
      setSelectedSystem(MOCK_DEFAULT_SYSTEM);
    }
  }

  // Build directory tree from config or use mock data
  const directoryNodes: TreeNode[] =
    state.systems.length > 0
      ? [{
          name: 'Roms',
          children: state.systems.map((sys) => ({ name: sys.name, children: [{ name: 'Imgs' }] })),
        }]
      : MOCK_DIRECTORY_NODES;

  const rootName = state.config?.downloadDir ?? MOCK_ROOT_NAME;

  // Combine real log entries with mock data
  const logItems: LogItem[] =
    state.log.length > 0
      ? state.log.map((entry) => ({ id: entry.id, status: entry.status, message: entry.message, size: entry.details }))
      : MOCK_LOG_ITEMS;

  // Handle directory selection
  const handleDirectorySelect = (path: string): void => {
    setSelectedDirPath(path);
    // Auto-switch to Files tab when selecting a directory
    setActiveTab('files');
  };

  // Sort file items
  const unsortedFileItems: FileItem[] = MOCK_FILES_BY_PATH[selectedDirPath] ?? [];
  const fileItems = [...unsortedFileItems].sort((a, b) => {
    const comparison = compareFileItems(a, b, sortField);
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

  // Handle keyboard navigation across all panels
  // eslint-disable-next-line complexity
  useInput((input, key) => {
    // Tab to cycle focus areas
    if (key.tab) {
      const direction = key.shift ? -1 : 1;
      const newFocus = cycleValue(focusArea, FOCUS_AREAS, direction);
      setFocusArea(newFocus);
      if (newFocus === 'run') {setRunFocus(key.shift ? 'send' : 'command');}
      return;
    }

    // Hotkey navigation (p, d, w, q)
    if (!key.ctrl) {
      if (input === 'p') {setFocusArea('run'); setRunFocus('command'); return;}
      if (input === 'd') {setFocusArea('directory'); return;}
      if (input === 'w') {setActiveTab('files'); setFocusArea('browse'); return;}
      if (input === 'q') {setActiveTab('log'); setFocusArea('browse'); return;}
    }

    // Navigate within run section using arrow keys
    if (focusArea === 'run') {
      const direction = getHorizontalNav(input, key);
      if (direction !== null) {
        setRunFocus(cycleValue(runFocus, RUN_FOCUS_ORDER, direction === 'right' ? 1 : -1));
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
