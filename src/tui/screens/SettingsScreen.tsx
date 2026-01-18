/**
 * Settings screen - Configuration view/edit interface
 * Phase 1: Placeholder implementation
 */

import { Box, Text, useInput } from 'ink';
import { Header, Footer } from '../components/index.js';
import { useTheme } from '../theme/index.js';
import { useAppState, useAppDispatch } from '../store/index.js';

/**
 * Settings screen component (placeholder for Phase 1)
 */
export function SettingsScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const state = useAppState();
  const dispatch = useAppDispatch();

  useInput((input, key) => {
    // Go back on Escape or q
    if (key.escape || input === 'q') {
      dispatch({ type: 'NAVIGATE', screen: 'home' });
    }
  });

  const config = state.config;

  return (
    <Box flexDirection="column" width="100%">
      <Header subtitle="Settings" />

      <Box
        borderStyle="single"
        borderColor={theme.border}
        flexDirection="column"
        paddingX={1}
        paddingY={1}
      >
        <Text color={theme.primary} bold>
          Configuration
        </Text>

        {config !== null ? (
          <Box marginTop={1} flexDirection="column">
            <Text>
              <Text color={theme.muted}>Download Dir: </Text>
              <Text color={theme.foreground}>{config.downloadDir}</Text>
            </Text>
            <Text>
              <Text color={theme.muted}>Systems: </Text>
              <Text color={theme.foreground}>{config.systems.length}</Text>
            </Text>
            <Text>
              <Text color={theme.muted}>Concurrency: </Text>
              <Text color={theme.foreground}>{config.concurrency}</Text>
            </Text>
            <Text>
              <Text color={theme.muted}>Log Level: </Text>
              <Text color={theme.foreground}>{config.logLevel}</Text>
            </Text>
          </Box>
        ) : (
          <Box marginTop={1}>
            <Text color={theme.warning}>No configuration loaded.</Text>
          </Box>
        )}

        <Box marginTop={2}>
          <Text color={theme.muted}>
            Full settings editing will be implemented in Phase 3.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.info}>
            Press <Text bold>q</Text> or <Text bold>Escape</Text> to go back.
          </Text>
        </Box>
      </Box>

      <Footer
        shortcuts={[
          { key: 'q', label: 'Back' },
          { key: 'Esc', label: 'Back' },
        ]}
      />
    </Box>
  );
}
