/**
 * TUI entry point
 * Launches the interactive terminal user interface
 */

import { render } from 'ink';
import { App } from './App.js';

type LaunchOptions = {
  /** Path to configuration file */
  configPath?: string;
};

/**
 * Launch the TUI application
 * @param options - Launch options
 * @returns Promise that resolves when the app exits
 */
export async function launchTUI(options: LaunchOptions = {}): Promise<void> {
  const { waitUntilExit } = render(<App configPath={options.configPath} />);
  await waitUntilExit();
}

// Re-export App for testing
export { App } from './App.js';
