/**
 * Terminal color support detection and fallbacks
 * Handles differences between terminals (true color, 256, basic 16)
 */

import { env } from 'node:process';

/** Color support levels */
export type ColorSupport = 'basic' | '256' | 'truecolor';

/**
 * Detect the terminal's color support level
 * @returns The detected color support level
 */
export function getColorSupport(): ColorSupport {
  // Check COLORTERM for true color support
  if (env.COLORTERM === 'truecolor' || env.COLORTERM === '24bit') {
    return 'truecolor';
  }

  // Check TERM for 256 color support
  const term = env.TERM;
  if (term !== undefined && term !== null && term.includes('256color')) {
    return '256';
  }

  return 'basic';
}

/**
 * Convert hex color to closest ANSI-256 color index
 * Uses the 6x6x6 color cube (indices 16-231)
 * @param hex - Hex color string (e.g., '#ff6600')
 * @returns ANSI-256 color index
 */
export function hexToAnsi256(hex: string): number {
  // Strip # prefix
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);

  // Convert to 6x6x6 color cube (indices 16-231)
  const ri = Math.round((r / 255) * 5);
  const gi = Math.round((g / 255) * 5);
  const bi = Math.round((b / 255) * 5);

  return 16 + 36 * ri + 6 * gi + bi;
}

/** Basic 16-color ANSI names */
type BasicColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white';

/** Parse hex string to RGB tuple */
function parseHexToRgb(hex: string): [number, number, number] {
  const rgb = hex.replace('#', '');
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  return [r, g, b];
}

/** Get basic color from dominant RGB channels */
function getColorFromChannels(r: number, g: number, b: number): BasicColor {
  const max = Math.max(r, g, b);

  // Very dark = black
  if (max < 64) {
    return 'black';
  }

  // All channels similar = white/gray
  if (r === max && g === max && b === max) {
    return 'white';
  }

  // Red dominant
  if (r === max) {
    return mapRedDominant(g, b);
  }

  // Green dominant
  if (g === max) {
    return b > 100 ? 'cyan' : 'green';
  }

  // Blue dominant
  return r > 100 ? 'magenta' : 'blue';
}

/** Map color when red is the dominant channel */
function mapRedDominant(g: number, b: number): BasicColor {
  if (g > b) {
    return 'yellow';
  }
  if (g > 100) {
    return 'yellow';
  }
  if (b > 100) {
    return 'magenta';
  }
  return 'red';
}

/**
 * Map hex color to closest basic 16-color name
 * @param hex - Hex color string
 * @returns Basic color name
 */
export function hexToBasicColor(hex: string): BasicColor {
  const [r, g, b] = parseHexToRgb(hex);
  return getColorFromChannels(r, g, b);
}

/**
 * Get color string based on terminal support
 * Returns the appropriate color format for the current terminal
 * @param hex - Hex color string
 * @returns Color string for Ink (hex, ansi256(N), or basic color name)
 */
export function resolveColor(hex: string): string {
  const support = getColorSupport();

  if (support === 'truecolor') {
    return hex;
  }

  if (support === '256') {
    return `ansi256(${hexToAnsi256(hex)})`;
  }

  // Basic: map to closest 16-color
  return hexToBasicColor(hex);
}
