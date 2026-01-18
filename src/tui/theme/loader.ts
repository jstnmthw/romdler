/**
 * Theme loader - resolves theme from configuration
 * For Phase 1, defaults to 'hacker' theme
 * Future: Will read ui.theme from config
 */

import { themes, DEFAULT_THEME, type ThemeName } from './themes.js';

/**
 * Resolve the theme name from configuration
 * Currently returns the default theme
 * @returns The resolved theme name
 */
export function resolveThemeName(): ThemeName {
  // Future: Read from config.ui?.theme
  // For now, return default theme
  return DEFAULT_THEME;
}

/**
 * Check if a string is a valid theme name
 * @param name - The string to check
 * @returns True if the name is a valid theme
 */
export function isValidThemeName(name: string): name is ThemeName {
  return name in themes;
}
