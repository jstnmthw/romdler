/**
 * StatusBar component for showing current task status
 */

import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import type { TaskStatus, TaskStats } from '../store/index.js';

type StatusBarProps = {
  /** Current task status */
  status: TaskStatus;
  /** Current command being run (if any) */
  command?: string;
  /** Task statistics */
  stats?: TaskStats;
};

/**
 * Status bar showing current operation status
 */
export function StatusBar({
  status,
  command,
  stats,
}: StatusBarProps): React.JSX.Element {
  const { theme } = useTheme();

  const getStatusColor = (): string => {
    switch (status) {
      case 'running':
        return theme.running;
      case 'complete':
        return theme.complete;
      case 'error':
        return theme.failed;
      default:
        return theme.muted;
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'running':
        return command !== undefined ? `Running: ${command}...` : 'Running...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Ready';
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
    >
      <Text color={theme.primary} bold>
        Status
      </Text>
      <Box marginTop={1}>
        <Text color={getStatusColor()}>{getStatusText()}</Text>
      </Box>

      {stats !== undefined && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.muted}>────────────────────────</Text>
          <Text>
            <Text color={theme.foreground}>Found:</Text>
            <Text color={theme.info}>
              {'.'
                .repeat(Math.max(1, 14 - String(stats.found).length))
                .concat(String(stats.found))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.foreground}>Filtered:</Text>
            <Text color={theme.info}>
              {'.'
                .repeat(Math.max(1, 11 - String(stats.filtered).length))
                .concat(String(stats.filtered))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.foreground}>Downloaded:</Text>
            <Text color={theme.complete}>
              {'.'
                .repeat(Math.max(1, 9 - String(stats.downloaded).length))
                .concat(String(stats.downloaded))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.foreground}>Skipped:</Text>
            <Text color={theme.skipped}>
              {'.'
                .repeat(Math.max(1, 12 - String(stats.skipped).length))
                .concat(String(stats.skipped))}
            </Text>
          </Text>
          <Text>
            <Text color={theme.foreground}>Failed:</Text>
            <Text color={theme.failed}>
              {'.'
                .repeat(Math.max(1, 13 - String(stats.failed).length))
                .concat(String(stats.failed))}
            </Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}
