/**
 * Theme token definitions for the TUI
 * Based on shadcn/ui CSS variables approach - all colors defined once
 */

/** Base color tokens - like CSS variables */
export type ThemeTokens = {
  // Brand
  primary: string;
  primaryMuted: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // UI
  background: string;
  foreground: string;
  muted: string;
  border: string;

  // Interactive
  accent: string;
  accentForeground: string;
  selection: string;
  selectionForeground: string;

  // Status indicators (for download/scrape operations)
  running: string;
  complete: string;
  skipped: string;
  failed: string;
};
