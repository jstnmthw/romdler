/**
 * Header component with ASCII banner and version
 */

import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';

const VERSION = '1.0.0';

/** ASCII art banner */
const BANNER_LINES = [
  '   ______                    __ __           ',
  '  |   __ \\.-----.--------.--|  |  |.-----.----.',
  '  |      <|  _  |        |  _  |  ||  -__|   _|',
  '  |___|__||_____|__|__|__|_____|__||_____|__|',
];

type HeaderProps = {
  /** Optional subtitle text */
  subtitle?: string;
};

/**
 * Header component displaying the ASCII banner and version
 */
export function Header({ subtitle }: HeaderProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ASCII Banner */}
      {BANNER_LINES.map((line, index) => (
        <Text key={index} color={theme.primary}>
          {line}
        </Text>
      ))}
      {/* Version line */}
      <Text>
        <Text color={theme.foreground}> Romdler </Text>
        <Text color={theme.muted}>v{VERSION}</Text>
        {subtitle !== undefined && subtitle !== '' && (
          <Text color={theme.muted}> - {subtitle}</Text>
        )}
      </Text>
    </Box>
  );
}
