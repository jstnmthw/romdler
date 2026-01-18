/**
 * BrowsePanel component
 * Tabbed panel with Files and Log views, plus progress bar
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';
import type { ThemeTokens } from '../theme/index.js';
import {
  getNavDirection,
  calculateScrollNav,
  calculateScrollbar,
  getScrollbarChar,
  cycleValue,
} from '../hooks/index.js';

/** Log entry for display */
export type LogItem = {
  id: string;
  status: 'downloaded' | 'skipped' | 'failed' | 'info';
  message: string;
  size?: string;
};

/** File entry for display */
export type FileItem = {
  name: string;
  size?: string;
  date?: string;
};

/** Sort options for files */
export type FileSortField = 'name' | 'size' | 'date';
export type FileSortDirection = 'asc' | 'desc';

/** Download progress info */
export type DownloadInfo = {
  filename: string;
  percentage: number;
  downloaded: string;
  total: string;
  speed: string;
  current: number;
  total_files: number;
};

type BrowsePanelProps = {
  activeTab: 'files' | 'log';
  onTabChange: (tab: 'files' | 'log') => void;
  logItems: LogItem[];
  fileItems: FileItem[];
  downloadProgress: DownloadInfo | null;
  isFocused?: boolean;
  maxRows?: number;
  sortField?: FileSortField;
  sortDirection?: FileSortDirection;
  onSortChange?: (field: FileSortField) => void;
};

/** Status icon mapping */
const STATUS_ICONS: Record<LogItem['status'], string> = {
  downloaded: '✔',
  skipped: '↷',
  failed: '✖',
  info: 'ℹ',
};

/** Get color for log status */
function getStatusColor(status: LogItem['status'], theme: ThemeTokens): string {
  const colorMap: Record<LogItem['status'], string> = {
    downloaded: theme.complete,
    skipped: theme.skipped,
    failed: theme.failed,
    info: theme.info,
  };
  return colorMap[status];
}

/** Get sort indicator arrow */
function getSortIndicator(
  field: FileSortField,
  currentField: FileSortField,
  direction: FileSortDirection
): string {
  if (field !== currentField) {return ' ';}
  return direction === 'asc' ? '▲' : '▼';
}

/** Sort field order for cycling */
const SORT_FIELDS: readonly FileSortField[] = ['name', 'size', 'date'];

/** Log view sub-component */
function LogView({
  items,
  scrollOffset,
  contentHeight,
  scrollbar,
  theme,
}: {
  items: LogItem[];
  scrollOffset: number;
  contentHeight: number;
  scrollbar: { hasScrollbar: boolean; thumbSize: number; thumbPosition: number };
  theme: ThemeTokens;
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <Box marginY={1} width="100%">
        <Text color={theme.muted}>No log entries yet</Text>
      </Box>
    );
  }

  const visibleItems = items.slice(scrollOffset, scrollOffset + contentHeight);

  return (
    <>
      {visibleItems.map((item, viewIndex) => (
        <Box key={item.id} width="100%">
          <Box flexGrow={1}>
            <Text color={getStatusColor(item.status, theme)}>{STATUS_ICONS[item.status]} </Text>
            <Text color={theme.foreground}>
              {item.message}
              {item.size !== undefined && item.size !== '' && (
                <Text color={theme.muted}> {item.size}</Text>
              )}
            </Text>
          </Box>
          {scrollbar.hasScrollbar && (
            <Text color={theme.muted}>
              {getScrollbarChar(viewIndex, scrollbar.thumbPosition, scrollbar.thumbSize)}
            </Text>
          )}
        </Box>
      ))}
    </>
  );
}

/** Files view sub-component */
function FilesView({
  items,
  scrollOffset,
  contentHeight,
  scrollbar,
  sortField,
  sortDirection,
  theme,
}: {
  items: FileItem[];
  scrollOffset: number;
  contentHeight: number;
  scrollbar: { hasScrollbar: boolean; thumbSize: number; thumbPosition: number };
  sortField: FileSortField;
  sortDirection: FileSortDirection;
  theme: ThemeTokens;
}): React.JSX.Element {
  const visibleItems = items.slice(scrollOffset, scrollOffset + contentHeight);

  return (
    <Box flexDirection="column" width="100%">
      {/* Sort headers */}
      <Box marginBottom={0} width="100%">
        <Box flexGrow={1}>
          <Text color={sortField === 'name' ? theme.primary : theme.muted} bold={sortField === 'name'}>
            Name {getSortIndicator('name', sortField, sortDirection)}
          </Text>
        </Box>
        <Box width={10}>
          <Text color={sortField === 'size' ? theme.primary : theme.muted} bold={sortField === 'size'}>
            Size {getSortIndicator('size', sortField, sortDirection)}
          </Text>
        </Box>
        <Box width={12}>
          <Text color={sortField === 'date' ? theme.primary : theme.muted} bold={sortField === 'date'}>
            Date {getSortIndicator('date', sortField, sortDirection)}
          </Text>
        </Box>
        {scrollbar.hasScrollbar && <Text color={theme.muted}> </Text>}
      </Box>
      {items.length === 0 ? (
        <Box marginY={1} width="100%">
          <Text color={theme.muted}>Select a directory to view files</Text>
        </Box>
      ) : (
        visibleItems.map((item, viewIndex) => (
          <Box key={`${viewIndex}-${item.name}`} width="100%">
            <Box flexGrow={1}>
              <Text color={theme.foreground}>{item.name}</Text>
            </Box>
            <Box width={10}>
              <Text color={theme.muted}>{item.size ?? '-'}</Text>
            </Box>
            <Box width={12}>
              <Text color={theme.muted}>{item.date ?? '-'}</Text>
            </Box>
            {scrollbar.hasScrollbar && (
              <Text color={theme.muted}>
                {getScrollbarChar(viewIndex, scrollbar.thumbPosition, scrollbar.thumbSize)}
              </Text>
            )}
          </Box>
        ))
      )}
    </Box>
  );
}

/** Download progress sub-component */
function ProgressSection({
  progress,
  theme,
}: {
  progress: DownloadInfo;
  theme: ThemeTokens;
}): React.JSX.Element {
  const filename =
    progress.filename.length > 45 ? progress.filename.slice(0, 42) + '...' : progress.filename;
  const filledBars = Math.floor(progress.percentage / 5);

  return (
    <>
      <Box width="100%">
        <Text color={theme.border}>{'─'.repeat(200)}</Text>
      </Box>
      <Box flexDirection="column">
        <Text color={theme.foreground}>
          Downloading <Text color={theme.info}>{filename}</Text>
        </Text>
        <Box>
          <Text color={theme.primary}>{'█'.repeat(filledBars)}</Text>
          <Text color={theme.muted}>{'░'.repeat(20 - filledBars)}</Text>
          <Text color={theme.foreground}>
            {' '}| {progress.percentage}% | {progress.downloaded}/{progress.total} |{' '}
            {progress.speed} | {progress.current}/{progress.total_files}
          </Text>
        </Box>
      </Box>
    </>
  );
}

/**
 * Tabbed panel with log/files views and progress indicator.
 * Complexity is inherent to multi-view panel with conditional rendering
 * for tabs, scrollbar, and download progress overlay.
 */
// eslint-disable-next-line complexity
export function BrowsePanel({
  activeTab,
  onTabChange: _onTabChange,
  logItems,
  fileItems,
  downloadProgress,
  isFocused = false,
  maxRows = 10,
  sortField = 'name',
  sortDirection = 'asc',
  onSortChange,
}: BrowsePanelProps): React.JSX.Element {
  const { theme } = useTheme();

  const [logScrollOffset, setLogScrollOffset] = useState(0);
  const [fileScrollOffset, setFileScrollOffset] = useState(0);

  const contentHeight = downloadProgress !== null ? maxRows - 3 : maxRows;
  const fileContentHeight = contentHeight - 1;

  const items = activeTab === 'log' ? logItems : fileItems;
  const scrollOffset = activeTab === 'log' ? logScrollOffset : fileScrollOffset;
  const setScrollOffset = activeTab === 'log' ? setLogScrollOffset : setFileScrollOffset;
  const visibleHeight = activeTab === 'log' ? contentHeight : fileContentHeight;

  useEffect(() => {
    if (scrollOffset >= items.length) {
      setScrollOffset(Math.max(0, items.length - 1));
    }
  }, [items.length, scrollOffset, setScrollOffset]);

  useInput(
    (input, key) => {
      if (input === 's' && activeTab === 'files' && onSortChange !== undefined) {
        onSortChange(cycleValue(sortField, SORT_FIELDS));
        return;
      }

      const direction = getNavDirection(input, key);
      if (direction !== null) {
        const maxOffset = Math.max(0, items.length - visibleHeight);
        const newOffset = calculateScrollNav(direction, scrollOffset, maxOffset, visibleHeight);
        setScrollOffset(newOffset);
      }
    },
    { isActive: isFocused }
  );

  const scrollbar = calculateScrollbar(items.length, visibleHeight, scrollOffset);

  return (
    <Box
      borderStyle="single"
      borderColor={isFocused ? theme.primary : theme.border}
      flexDirection="column"
      flexGrow={1}
      width="100%"
      paddingX={1}
    >
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>Browse</Text>
      </Box>

      <Box justifyContent="center" marginBottom={0}>
        <Box marginRight={4}>
          <Text color={activeTab === 'files' ? theme.primary : theme.muted} bold={activeTab === 'files'}>
            Files (w)
          </Text>
        </Box>
        <Text color={theme.border}>|</Text>
        <Box marginLeft={4}>
          <Text color={activeTab === 'log' ? theme.primary : theme.muted} bold={activeTab === 'log'}>
            Log (q)
          </Text>
        </Box>
      </Box>

      <Box width="100%">
        <Text color={theme.border}>{'─'.repeat(200)}</Text>
      </Box>

      <Box flexDirection="column" height={contentHeight} width="100%">
        {activeTab === 'log' ? (
          <LogView
            items={logItems}
            scrollOffset={logScrollOffset}
            contentHeight={contentHeight}
            scrollbar={scrollbar}
            theme={theme}
          />
        ) : (
          <FilesView
            items={fileItems}
            scrollOffset={fileScrollOffset}
            contentHeight={fileContentHeight}
            scrollbar={scrollbar}
            sortField={sortField}
            sortDirection={sortDirection}
            theme={theme}
          />
        )}
      </Box>

      {downloadProgress !== null && <ProgressSection progress={downloadProgress} theme={theme} />}
    </Box>
  );
}
