/**
 * Footer component with keyboard shortcuts
 * Layout: ^c Quit   ^p Commands   ^q Log   ^w Files   f1 Help
 */

import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';

/** A keyboard shortcut definition */
export type Shortcut = {
  key: string;
  label: string;
};

type FooterProps = {
  /** Shortcuts to display */
  shortcuts?: Shortcut[];
};

/**
 * Footer component displaying keyboard shortcuts
 */
export function Footer({ shortcuts = [] }: FooterProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Box marginTop={1}>
      {shortcuts.map((shortcut, index) => (
        <Box key={`${index}-${shortcut.key}`} marginRight={3}>
          <Text color={theme.accent} bold>
            {shortcut.key}
          </Text>
          <Text color={theme.muted}> {shortcut.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
