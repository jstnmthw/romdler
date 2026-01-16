import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli/index.js';

describe('CLI argument parser', () => {
  describe('parseArgs', () => {
    it('returns defaults with empty args', () => {
      const result = parseArgs([]);

      expect(result.dryRun).toBe(false);
      expect(result.configPath).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('parses --dry-run flag', () => {
      const result = parseArgs(['--dry-run']);

      expect(result.dryRun).toBe(true);
    });

    it('parses -n short flag for dry-run', () => {
      const result = parseArgs(['-n']);

      expect(result.dryRun).toBe(true);
    });

    it('parses --config with path', () => {
      const result = parseArgs(['--config', './custom.json']);

      expect(result.configPath).toBe('./custom.json');
    });

    it('parses -c short flag for config', () => {
      const result = parseArgs(['-c', '/path/to/config.json']);

      expect(result.configPath).toBe('/path/to/config.json');
    });

    it('parses --limit with positive integer', () => {
      const result = parseArgs(['--limit', '10']);

      expect(result.limit).toBe(10);
    });

    it('parses -l short flag for limit', () => {
      const result = parseArgs(['-l', '5']);

      expect(result.limit).toBe(5);
    });

    it('ignores --limit with zero value', () => {
      const result = parseArgs(['--limit', '0']);

      expect(result.limit).toBeUndefined();
    });

    it('ignores --limit with negative value', () => {
      const result = parseArgs(['--limit', '-5']);

      expect(result.limit).toBeUndefined();
    });

    it('ignores --limit with non-numeric value', () => {
      const result = parseArgs(['--limit', 'abc']);

      expect(result.limit).toBeUndefined();
    });

    it('ignores --config without value', () => {
      const result = parseArgs(['--config']);

      expect(result.configPath).toBeUndefined();
    });

    it('ignores --config when next arg starts with dash', () => {
      const result = parseArgs(['--config', '--dry-run']);

      expect(result.configPath).toBeUndefined();
      expect(result.dryRun).toBe(true);
    });

    it('ignores --limit without value', () => {
      const result = parseArgs(['--limit']);

      expect(result.limit).toBeUndefined();
    });

    it('parses multiple flags together', () => {
      const result = parseArgs(['--dry-run', '--config', 'test.json', '--limit', '3']);

      expect(result.dryRun).toBe(true);
      expect(result.configPath).toBe('test.json');
      expect(result.limit).toBe(3);
    });

    it('parses flags in any order', () => {
      const result = parseArgs(['-l', '7', '-c', 'my.json', '-n']);

      expect(result.dryRun).toBe(true);
      expect(result.configPath).toBe('my.json');
      expect(result.limit).toBe(7);
    });

    it('ignores unknown arguments', () => {
      const result = parseArgs(['--unknown', 'value', '--dry-run']);

      expect(result.dryRun).toBe(true);
      expect(result.configPath).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    it('handles float values for limit by truncating', () => {
      const result = parseArgs(['--limit', '5.9']);

      expect(result.limit).toBe(5);
    });
  });
});
