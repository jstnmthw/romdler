/**
 * Predefined themes for the TUI
 * Each theme implements ThemeTokens for consistent color usage
 */

import type { ThemeTokens } from './tokens.js';

export const themes = {
  /** Default monochrome with turquoise accent */
  default: {
    primary: '#40e0d0', // Turquoise
    primaryMuted: '#2a9d8f',
    success: '#40e0d0',
    warning: '#ffd700',
    error: '#ff6b6b',
    info: '#40e0d0',
    background: '#1b2423',
    foreground: '#e0e0e0',
    muted: '#808080',
    border: '#404040',
    accent: '#40e0d0',
    accentForeground: '#000000',
    selection: '#1a3a3a',
    selectionForeground: '#e0e0e0',
    running: '#40e0d0',
    complete: '#40e0d0',
    skipped: '#808080',
    failed: '#ff6b6b',
  },

  /** Classic hacker aesthetic - green on black */
  hacker: {
    primary: '#00ff00',
    primaryMuted: '#008800',
    success: '#00ff00',
    warning: '#ffff00',
    error: '#ff0000',
    info: '#00ffff',
    background: '#000000',
    foreground: '#00ff00',
    muted: '#006600',
    border: '#004400',
    accent: '#00ff00',
    accentForeground: '#000000',
    selection: '#003300',
    selectionForeground: '#00ff00',
    running: '#00ffff',
    complete: '#00ff00',
    skipped: '#888888',
    failed: '#ff0000',
  },

  /** Cyberpunk - magenta/cyan neon */
  cyberpunk: {
    primary: '#ff00ff',
    primaryMuted: '#880088',
    success: '#00ff88',
    warning: '#ffff00',
    error: '#ff0044',
    info: '#00ffff',
    background: '#0a0a0f',
    foreground: '#ffffff',
    muted: '#666688',
    border: '#ff00ff',
    accent: '#00ffff',
    accentForeground: '#000000',
    selection: '#330033',
    selectionForeground: '#ff00ff',
    running: '#00ffff',
    complete: '#00ff88',
    skipped: '#666688',
    failed: '#ff0044',
  },

  /** Minimal - subtle grays with blue accent */
  minimal: {
    primary: '#3b82f6',
    primaryMuted: '#1e40af',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
    background: '#000000',
    foreground: '#e5e5e5',
    muted: '#737373',
    border: '#404040',
    accent: '#3b82f6',
    accentForeground: '#ffffff',
    selection: '#1e3a5f',
    selectionForeground: '#ffffff',
    running: '#3b82f6',
    complete: '#22c55e',
    skipped: '#737373',
    failed: '#ef4444',
  },

  /** Dracula - popular dark theme */
  dracula: {
    primary: '#bd93f9',
    primaryMuted: '#6272a4',
    success: '#50fa7b',
    warning: '#f1fa8c',
    error: '#ff5555',
    info: '#8be9fd',
    background: '#282a36',
    foreground: '#f8f8f2',
    muted: '#6272a4',
    border: '#44475a',
    accent: '#ff79c6',
    accentForeground: '#282a36',
    selection: '#44475a',
    selectionForeground: '#f8f8f2',
    running: '#8be9fd',
    complete: '#50fa7b',
    skipped: '#6272a4',
    failed: '#ff5555',
  },
} as const satisfies Record<string, ThemeTokens>;

export type ThemeName = keyof typeof themes;
export const DEFAULT_THEME: ThemeName = 'default';

/** List of available theme names for config validation */
export const THEME_NAMES = Object.keys(themes) as ThemeName[];
