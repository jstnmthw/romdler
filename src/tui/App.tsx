/**
 * Main TUI application component
 * Handles routing between screens
 */

import { Box, useApp, useInput } from 'ink';
import { useEffect } from 'react';
import { ThemeProvider, resolveThemeName } from './theme/index.js';
import { AppProvider, useAppState } from './store/index.js';
import { useConfig } from './hooks/index.js';
import {
  HomeScreen,
  DownloadScreen,
  ScrapeScreen,
  DedupeScreen,
  PurgeScreen,
  SettingsScreen,
} from './screens/index.js';

type AppContentProps = {
  /** Optional path to config file */
  configPath?: string;
};

/**
 * App content - renders the current screen based on state
 */
function AppContent({ configPath }: AppContentProps): React.JSX.Element {
  const state = useAppState();
  const { load } = useConfig();
  const { exit } = useApp();

  // Load config on mount
  useEffect(() => {
    try {
      load(configPath);
    } catch {
      // Config loading error is non-fatal, user can still navigate
      // Silently ignore - users will see "No config loaded" in the UI
    }
  }, [configPath, load]);

  // Global quit handler
  useInput((input, key) => {
    // Ctrl+C is handled by Ink automatically
    // But we can also quit with Ctrl+Q from home
    if (key.ctrl && input === 'q' && state.screen === 'home') {
      exit();
    }
  });

  // Render current screen
  switch (state.screen) {
    case 'home':
      return <HomeScreen />;
    case 'download':
      return <DownloadScreen />;
    case 'scrape':
      return <ScrapeScreen />;
    case 'dedupe':
      return <DedupeScreen />;
    case 'purge':
      return <PurgeScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <HomeScreen />;
  }
}

type AppProps = {
  /** Optional path to config file */
  configPath?: string;
};

/**
 * Root application component
 * Wraps content with providers
 */
export function App({ configPath }: AppProps): React.JSX.Element {
  const themeName = resolveThemeName();

  return (
    <ThemeProvider initialTheme={themeName}>
      <AppProvider>
        <Box flexDirection="column" padding={1}>
          <AppContent configPath={configPath} />
        </Box>
      </AppProvider>
    </ThemeProvider>
  );
}
