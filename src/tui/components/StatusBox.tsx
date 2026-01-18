/**
 * StatusBox component
 * Shows running status and statistics
 * Layout: ┌─Status─────────────────────┐
 *         │                            │
 *         │  Running: Download...      │
 *         │  ────────────────────────  │
 *         │  Found:.............1,304  │
 *         │  Filtered:..........324    │
 *         │  Downloaded:........422    │
 *         │  Skipped:...........32     │
 *         │  Failed:............1      │
 *         │                            │
 *         └────────────────────────────┘
 */

import { Box, Text } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';
import type { TaskStatus, TaskStats } from '../store/index.js';

type StatusBoxProps = {
  /** Current task status */
  status: TaskStatus;
  /** Current command name (when running) */
  command?: string;
  /** Task statistics */
  stats: TaskStats;
  /** Box width */
  width?: number;
};

/** Format a stat line with dots alignment */
function formatStatLine(label: string, value: number, totalWidth: number): string {
  const valueStr = value.toLocaleString();
  const labelPart = `${label}:`;
  const dotsNeeded = Math.max(1, totalWidth - labelPart.length - valueStr.length);
  return `${labelPart}${'.'.repeat(dotsNeeded)}${valueStr}`;
}

/**
 * Animated loading dots component
 */
function LoadingDots(): React.JSX.Element {
  const [dots, setDots] = useState(1);

  useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      setDots((prev) => (prev % 3) + 1);
    }, 400);
    return (): void => {
      clearInterval(interval);
    };
  }, []);

  return <Text>{'.'.repeat(dots)}</Text>;
}

/**
 * Status box showing task state and statistics
 */
export function StatusBox({
  status,
  command,
  stats,
  width = 28,
}: StatusBoxProps): React.JSX.Element {
  const { theme } = useTheme();
  const innerWidth = width - 4; // Account for border and padding
  const statWidth = innerWidth - 2;

  const getStatusDisplay = (): React.JSX.Element => {
    switch (status) {
      case 'running':
        return (
          <Text color={theme.running}>
            Running: {command ?? 'Task'}
            <LoadingDots />
          </Text>
        );
      case 'complete':
        return <Text color={theme.complete}>Complete</Text>;
      case 'error':
        return <Text color={theme.failed}>Error</Text>;
      default:
        return <Text color={theme.muted}>-</Text>;
    }
  };

  return (
    <Box
      borderStyle="single"
      borderColor={theme.border}
      flexDirection="column"
      width={width}
      paddingX={1}
    >
      {/* Title in top border */}
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>
          Status
        </Text>
      </Box>

      {/* Status line */}
      <Box marginTop={1}>{getStatusDisplay()}</Box>

      {/* Separator */}
      <Box marginY={0}>
        <Text color={theme.border}>{'─'.repeat(innerWidth)}</Text>
      </Box>

      {/* Stats */}
      <Box flexDirection="column">
        <Text>
          <Text color={theme.foreground}>
            {formatStatLine('Found', stats.found, statWidth).slice(0, -stats.found.toLocaleString().length)}
          </Text>
          <Text color={theme.info}>{stats.found.toLocaleString()}</Text>
        </Text>
        <Text>
          <Text color={theme.foreground}>
            {formatStatLine('Filtered', stats.filtered, statWidth).slice(0, -stats.filtered.toLocaleString().length)}
          </Text>
          <Text color={theme.info}>{stats.filtered.toLocaleString()}</Text>
        </Text>
        <Text>
          <Text color={theme.foreground}>
            {formatStatLine('Downloaded', stats.downloaded, statWidth).slice(0, -stats.downloaded.toLocaleString().length)}
          </Text>
          <Text color={theme.complete}>{stats.downloaded.toLocaleString()}</Text>
        </Text>
        <Text>
          <Text color={theme.foreground}>
            {formatStatLine('Skipped', stats.skipped, statWidth).slice(0, -stats.skipped.toLocaleString().length)}
          </Text>
          <Text color={theme.skipped}>{stats.skipped.toLocaleString()}</Text>
        </Text>
        <Text>
          <Text color={theme.foreground}>
            {formatStatLine('Failed', stats.failed, statWidth).slice(0, -stats.failed.toLocaleString().length)}
          </Text>
          <Text color={theme.failed}>{stats.failed.toLocaleString()}</Text>
        </Text>
      </Box>
    </Box>
  );
}
