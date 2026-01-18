/**
 * ProgressBar component
 * Simple horizontal progress bar
 * Layout: █████████████░░░░░░░| 67%
 */

import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';

type ProgressBarProps = {
  /** Progress value (0-100) */
  value: number;
  /** Width of the bar in characters */
  width?: number;
  /** Show percentage text */
  showPercentage?: boolean;
  /** Custom filled character */
  filledChar?: string;
  /** Custom empty character */
  emptyChar?: string;
};

/**
 * Horizontal progress bar component
 */
export function ProgressBar({
  value,
  width = 20,
  showPercentage = true,
  filledChar = '█',
  emptyChar = '░',
}: ProgressBarProps): React.JSX.Element {
  const { theme } = useTheme();

  // Clamp value to 0-100
  const clampedValue = Math.max(0, Math.min(100, value));
  const filledWidth = Math.floor((clampedValue / 100) * width);
  const emptyWidth = width - filledWidth;

  return (
    <Box>
      <Text color={theme.primary}>{filledChar.repeat(filledWidth)}</Text>
      <Text color={theme.muted}>{emptyChar.repeat(emptyWidth)}</Text>
      {showPercentage && (
        <Text color={theme.foreground}>| {Math.round(clampedValue)}%</Text>
      )}
    </Box>
  );
}
