/**
 * Theme module exports
 * Provides theming system for the TUI
 */

export type { ThemeTokens } from './tokens.js';
export { themes, DEFAULT_THEME, THEME_NAMES, type ThemeName } from './themes.js';
export { ThemeProvider, useTheme } from './context.js';
export {
  getColorSupport,
  hexToAnsi256,
  hexToBasicColor,
  resolveColor,
  type ColorSupport,
} from './compat.js';
export { resolveThemeName, isValidThemeName } from './loader.js';
