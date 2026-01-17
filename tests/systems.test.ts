import { describe, it, expect } from 'vitest';
import {
  SYSTEM_REGISTRY,
  getSystemInfo,
  getValidShortcodes,
  isValidShortcode,
} from '../src/systems/index.js';

describe('systems registry', () => {
  describe('SYSTEM_REGISTRY', () => {
    it('contains expected systems', () => {
      expect(SYSTEM_REGISTRY.gb).toBeDefined();
      expect(SYSTEM_REGISTRY.gbc).toBeDefined();
      expect(SYSTEM_REGISTRY.snes).toBeDefined();
      expect(SYSTEM_REGISTRY.md).toBeDefined();
    });

    it('has correct structure for each system', () => {
      const gbc = SYSTEM_REGISTRY.gbc;
      expect(gbc).toBeDefined();
      expect(gbc!.name).toBe('Nintendo - Game Boy Color');
      expect(gbc!.systemId).toBe(10);
      expect(gbc!.extensions).toContain('.gbc');
    });

    it('supports aliases', () => {
      // sfc and snes should be the same system
      expect(SYSTEM_REGISTRY.sfc?.systemId).toBe(SYSTEM_REGISTRY.snes?.systemId);
      expect(SYSTEM_REGISTRY.fc?.systemId).toBe(SYSTEM_REGISTRY.nes?.systemId);
      expect(SYSTEM_REGISTRY.genesis?.systemId).toBe(SYSTEM_REGISTRY.md?.systemId);
    });
  });

  describe('getSystemInfo', () => {
    it('returns system info for valid shortcode', () => {
      const info = getSystemInfo('gbc');
      expect(info).toBeDefined();
      expect(info?.name).toBe('Nintendo - Game Boy Color');
      expect(info?.systemId).toBe(10);
    });

    it('returns undefined for invalid shortcode', () => {
      const info = getSystemInfo('nonexistent');
      expect(info).toBeUndefined();
    });

    it('is case-insensitive', () => {
      const lower = getSystemInfo('gbc');
      const upper = getSystemInfo('GBC');
      const mixed = getSystemInfo('GbC');

      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });
  });

  describe('getValidShortcodes', () => {
    it('returns array of shortcodes', () => {
      const shortcodes = getValidShortcodes();
      expect(Array.isArray(shortcodes)).toBe(true);
      expect(shortcodes.length).toBeGreaterThan(0);
    });

    it('includes expected shortcodes', () => {
      const shortcodes = getValidShortcodes();
      expect(shortcodes).toContain('gb');
      expect(shortcodes).toContain('gbc');
      expect(shortcodes).toContain('snes');
      expect(shortcodes).toContain('md');
      expect(shortcodes).toContain('mame');
    });

    it('includes Anbernic folder names', () => {
      const shortcodes = getValidShortcodes();
      // Anbernic-specific shortcodes
      expect(shortcodes).toContain('fc');
      expect(shortcodes).toContain('sfc');
      expect(shortcodes).toContain('mdcd');
      expect(shortcodes).toContain('fbneo');
      expect(shortcodes).toContain('poke');
    });
  });

  describe('isValidShortcode', () => {
    it('returns true for valid shortcodes', () => {
      expect(isValidShortcode('gb')).toBe(true);
      expect(isValidShortcode('gbc')).toBe(true);
      expect(isValidShortcode('snes')).toBe(true);
      expect(isValidShortcode('mame')).toBe(true);
    });

    it('returns false for invalid shortcodes', () => {
      expect(isValidShortcode('nonexistent')).toBe(false);
      expect(isValidShortcode('invalid')).toBe(false);
      expect(isValidShortcode('')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isValidShortcode('GBC')).toBe(true);
      expect(isValidShortcode('Gbc')).toBe(true);
      expect(isValidShortcode('gBc')).toBe(true);
    });
  });
});
