/**
 * System registry - lookup functions for system definitions.
 * Edit definitions.ts to add or modify systems.
 */

import { SYSTEM_DEFINITIONS, type SystemDefinition } from './definitions.js';

/** Re-export for convenience */
export type SystemInfo = SystemDefinition;

/** Re-export the registry */
export const SYSTEM_REGISTRY = SYSTEM_DEFINITIONS;

/**
 * Get system info by shortcode
 * @param shortcode - System shortcode (e.g., 'gbc', 'snes')
 * @returns System info or undefined if not found
 */
export function getSystemInfo(shortcode: string): SystemInfo | undefined {
  return SYSTEM_REGISTRY[shortcode.toLowerCase()];
}

/**
 * Get all valid shortcodes
 */
export function getValidShortcodes(): string[] {
  return Object.keys(SYSTEM_REGISTRY);
}

/**
 * Check if a shortcode is valid (built-in)
 */
export function isValidShortcode(shortcode: string): boolean {
  return shortcode.toLowerCase() in SYSTEM_REGISTRY;
}
