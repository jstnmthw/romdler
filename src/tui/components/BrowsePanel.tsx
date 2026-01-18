/**
 * BrowsePanel component
 * Tabbed panel with Files and Log views, plus progress bar
 * Layout: ┌───Browse────────────────────────────────────────────────────────────┐
 *         │                Files (w)         |         Log (q)                  │
 *         ├─────────────────────────────────────────────────────────────────────┤
 *         │  ↷ 2001 FIFA World Cup - Germany 2001.zip skipped                  █
 *         │  ✔ 2K Sports - Major League Baseball 2K7 (USA).zip 1.2mb           ░
 *         │  ... scrollable content ...                                         ░
 *         ├─────────────────────────────────────────────────────────────────────┤
 *         │   Downloading 2K Sports - Major League Baseball (US..               │
 *         │   █████████████░░░░░░░| 67% | 1.2 MB/1.8 MB | 11.9 MB/s | 5/20      │
 *         └─────────────────────────────────────────────────────────────────────┘
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';

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
  /** Currently active tab */
  activeTab: 'files' | 'log';
  /** Called when tab changes */
  onTabChange: (tab: 'files' | 'log') => void;
  /** Log entries */
  logItems: LogItem[];
  /** File entries */
  fileItems: FileItem[];
  /** Current download progress (null if not downloading) */
  downloadProgress: DownloadInfo | null;
  /** Whether this panel is focused */
  isFocused?: boolean;
  /** Max visible rows in scrollable area */
  maxRows?: number;
  /** Current sort field for files */
  sortField?: FileSortField;
  /** Current sort direction for files */
  sortDirection?: FileSortDirection;
  /** Called when sort changes */
  onSortChange?: (field: FileSortField) => void;
};

/** Get status icon */
function getStatusIcon(status: LogItem['status']): string {
  switch (status) {
    case 'downloaded':
      return '✔';
    case 'skipped':
      return '↷';
    case 'failed':
      return '✖';
    case 'info':
      return 'ℹ';
    default:
      return ' ';
  }
}

/**
 * Tabbed browse panel with Files/Log views
 */
/** Get sort indicator arrow */
function getSortIndicator(
  field: FileSortField,
  currentField: FileSortField,
  direction: FileSortDirection
): string {
  if (field !== currentField) {
    return ' ';
  }
  return direction === 'asc' ? '▲' : '▼';
}

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

  // Scroll state for each tab
  const [logScrollOffset, setLogScrollOffset] = useState(0);
  const [fileScrollOffset, setFileScrollOffset] = useState(0);

  // Calculate content height (account for header row in files view)
  const contentHeight = downloadProgress !== null ? maxRows - 3 : maxRows;
  const fileContentHeight = contentHeight - 1; // Account for header row

  // Get current items and scroll offset
  const items = activeTab === 'log' ? logItems : fileItems;
  const scrollOffset = activeTab === 'log' ? logScrollOffset : fileScrollOffset;
  const setScrollOffset = activeTab === 'log' ? setLogScrollOffset : setFileScrollOffset;
  const visibleHeight = activeTab === 'log' ? contentHeight : fileContentHeight;

  // Reset scroll when items change or tab changes
  useEffect(() => {
    if (scrollOffset >= items.length) {
      setScrollOffset(Math.max(0, items.length - 1));
    }
  }, [items.length, scrollOffset, setScrollOffset]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      // S key cycles sort field when in files tab
      if (input === 's' && activeTab === 'files' && onSortChange !== undefined) {
        const fields: FileSortField[] = ['name', 'size', 'date'];
        const currentIndex = fields.indexOf(sortField);
        const nextIndex = (currentIndex + 1) % fields.length;
        const nextField = fields[nextIndex];
        if (nextField !== undefined) {
          onSortChange(nextField);
        }
        return;
      }

      // Scroll navigation
      if (key.upArrow || input === 'k') {
        setScrollOffset(Math.max(0, scrollOffset - 1));
      } else if (key.downArrow || input === 'j') {
        const maxOffset = Math.max(0, items.length - visibleHeight);
        setScrollOffset(Math.min(maxOffset, scrollOffset + 1));
      } else if (key.pageUp) {
        setScrollOffset(Math.max(0, scrollOffset - visibleHeight));
      } else if (key.pageDown) {
        const maxOffset = Math.max(0, items.length - visibleHeight);
        setScrollOffset(Math.min(maxOffset, scrollOffset + visibleHeight));
      }
    },
    { isActive: isFocused }
  );

  const hasScrollbar = items.length > visibleHeight;

  // Calculate scrollbar position
  const scrollRatio = items.length > visibleHeight ? visibleHeight / items.length : 1;
  const thumbSize = Math.max(1, Math.floor(scrollRatio * visibleHeight));
  const maxScrollOffset = Math.max(1, items.length - visibleHeight);
  const thumbPosition = Math.floor((scrollOffset / maxScrollOffset) * (visibleHeight - thumbSize));

  return (
    <Box
      borderStyle="single"
      borderColor={isFocused ? theme.primary : theme.border}
      flexDirection="column"
      flexGrow={1}
      width="100%"
      paddingX={1}
    >
      {/* Title */}
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>
          Browse
        </Text>
      </Box>

      {/* Tab bar */}
      <Box justifyContent="center" marginBottom={0}>
        <Box marginRight={4}>
          <Text
            color={activeTab === 'files' ? theme.primary : theme.muted}
            bold={activeTab === 'files'}
          >
            Files (w)
          </Text>
        </Box>
        <Text color={theme.border}>|</Text>
        <Box marginLeft={4}>
          <Text
            color={activeTab === 'log' ? theme.primary : theme.muted}
            bold={activeTab === 'log'}
          >
            Log (q)
          </Text>
        </Box>
      </Box>

      {/* Separator - uses flexGrow to fill width */}
      <Box width="100%">
        <Text color={theme.border}>{'─'.repeat(200)}</Text>
      </Box>

      {/* Content area */}
      <Box flexDirection="column" height={contentHeight} width="100%">
        {activeTab === 'log' ? (
          // Log view
          logItems.length === 0 ? (
            <Box marginY={1} width="100%">
              <Text color={theme.muted}>No log entries yet</Text>
            </Box>
          ) : (
            logItems.slice(logScrollOffset, logScrollOffset + contentHeight).map((item, viewIndex) => {
              const icon = getStatusIcon(item.status);
              const iconColor =
                item.status === 'downloaded'
                  ? theme.complete
                  : item.status === 'skipped'
                    ? theme.skipped
                    : item.status === 'failed'
                      ? theme.failed
                      : theme.info;

              return (
                <Box key={item.id} width="100%">
                  <Box flexGrow={1}>
                    <Text color={iconColor}>{icon} </Text>
                    <Text color={theme.foreground}>
                      {item.message}
                      {item.size !== undefined && item.size !== '' && (
                        <Text color={theme.muted}> {item.size}</Text>
                      )}
                    </Text>
                  </Box>
                  {hasScrollbar && (
                    <Text color={theme.muted}>
                      {viewIndex >= thumbPosition && viewIndex < thumbPosition + thumbSize ? '█' : '░'}
                    </Text>
                  )}
                </Box>
              );
            })
          )
        ) : (
          // Files view
          <Box flexDirection="column" width="100%">
            {/* Sort headers */}
            <Box marginBottom={0} width="100%">
              <Box flexGrow={1}>
                <Text
                  color={sortField === 'name' ? theme.primary : theme.muted}
                  bold={sortField === 'name'}
                >
                  Name {getSortIndicator('name', sortField, sortDirection)}
                </Text>
              </Box>
              <Box width={10}>
                <Text
                  color={sortField === 'size' ? theme.primary : theme.muted}
                  bold={sortField === 'size'}
                >
                  Size {getSortIndicator('size', sortField, sortDirection)}
                </Text>
              </Box>
              <Box width={12}>
                <Text
                  color={sortField === 'date' ? theme.primary : theme.muted}
                  bold={sortField === 'date'}
                >
                  Date {getSortIndicator('date', sortField, sortDirection)}
                </Text>
              </Box>
              {hasScrollbar && <Text color={theme.muted}> </Text>}
            </Box>
            {fileItems.length === 0 ? (
              <Box marginY={1} width="100%">
                <Text color={theme.muted}>Select a directory to view files</Text>
              </Box>
            ) : (
              fileItems.slice(fileScrollOffset, fileScrollOffset + fileContentHeight).map((item, viewIndex) => (
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
                  {hasScrollbar && (
                    <Text color={theme.muted}>
                      {viewIndex >= thumbPosition && viewIndex < thumbPosition + thumbSize ? '█' : '░'}
                    </Text>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>

      {/* Progress section (when downloading) */}
      {downloadProgress !== null && (
        <>
          <Box width="100%">
            <Text color={theme.border}>{'─'.repeat(200)}</Text>
          </Box>
          <Box flexDirection="column">
            <Text color={theme.foreground}>
              Downloading{' '}
              <Text color={theme.info}>
                {downloadProgress.filename.length > 45
                  ? downloadProgress.filename.slice(0, 42) + '...'
                  : downloadProgress.filename}
              </Text>
            </Text>
            <Box>
              {/* Progress bar */}
              <Text color={theme.primary}>
                {'█'.repeat(Math.floor(downloadProgress.percentage / 5))}
              </Text>
              <Text color={theme.muted}>
                {'░'.repeat(20 - Math.floor(downloadProgress.percentage / 5))}
              </Text>
              <Text color={theme.foreground}>
                {' '}| {downloadProgress.percentage}% | {downloadProgress.downloaded}/{downloadProgress.total} |{' '}
                {downloadProgress.speed} | {downloadProgress.current}/{downloadProgress.total_files}
              </Text>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
