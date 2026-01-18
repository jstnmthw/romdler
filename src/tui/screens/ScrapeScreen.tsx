/**
 * Scrape screen - Artwork download interface
 * Phase 1: Placeholder implementation
 */

import { Box, Text, useInput } from 'ink';
import { Header, Footer } from '../components/index.js';
import { useTheme } from '../theme/index.js';
import { useAppDispatch } from '../store/index.js';

/**
 * Scrape screen component (placeholder for Phase 1)
 */
export function ScrapeScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const dispatch = useAppDispatch();

  useInput((input, key) => {
    // Go back on Escape or q
    if (key.escape || input === 'q') {
      dispatch({ type: 'NAVIGATE', screen: 'home' });
    }
  });

  return (
    <Box flexDirection="column" width="100%">
      <Header subtitle="Scrape Artwork" />

      <Box
        borderStyle="single"
        borderColor={theme.border}
        flexDirection="column"
        paddingX={1}
        paddingY={1}
      >
        <Text color={theme.primary} bold>
          Artwork Scraper
        </Text>
        <Box marginTop={1}>
          <Text color={theme.muted}>
            Scrape functionality will be implemented in Phase 2.
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
