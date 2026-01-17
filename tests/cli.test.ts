import { describe, it, expect } from 'vitest';
import { parseArgs } from '../src/cli/index.js';

describe('CLI argument parser', () => {
  describe('parseArgs', () => {
    it('returns defaults with empty args', () => {
      const result = parseArgs([]);

      expect(result.command).toBe('download');
      expect(result.dryRun).toBe(false);
      expect(result.configPath).toBeUndefined();
      expect(result.limit).toBeUndefined();
    });

    describe('command parsing', () => {
      it('defaults to download command', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('download');
      });

      it('parses download command explicitly', () => {
        const result = parseArgs(['download']);
        expect(result.command).toBe('download');
      });

      it('parses scrape command', () => {
        const result = parseArgs(['scrape']);
        expect(result.command).toBe('scrape');
      });

      it('parses purge command', () => {
        const result = parseArgs(['purge']);
        expect(result.command).toBe('purge');
      });

      it('parses dedupe command', () => {
        const result = parseArgs(['dedupe']);
        expect(result.command).toBe('dedupe');
      });

      it('parses command case-insensitively', () => {
        expect(parseArgs(['SCRAPE']).command).toBe('scrape');
        expect(parseArgs(['Purge']).command).toBe('purge');
        expect(parseArgs(['DEDUPE']).command).toBe('dedupe');
      });

      it('skips leading -- delimiter', () => {
        const result = parseArgs(['--', 'scrape', '--dry-run']);
        expect(result.command).toBe('scrape');
        expect(result.dryRun).toBe(true);
      });

      it('parses flags after command', () => {
        const result = parseArgs(['purge', '--dry-run', '--limit', '5']);
        expect(result.command).toBe('purge');
        expect(result.dryRun).toBe(true);
        expect(result.limit).toBe(5);
      });

      it('parses dedupe with flags', () => {
        const result = parseArgs(['dedupe', '-n', '-l', '10']);
        expect(result.command).toBe('dedupe');
        expect(result.dryRun).toBe(true);
        expect(result.limit).toBe(10);
      });
    });

    describe('scrape command options', () => {
      it('parses --force flag', () => {
        const result = parseArgs(['scrape', '--force']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.force).toBe(true);
        }
      });

      it('parses -f short flag for force', () => {
        const result = parseArgs(['scrape', '-f']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.force).toBe(true);
        }
      });

      it('parses --media option', () => {
        const result = parseArgs(['scrape', '--media', 'box-2D']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.mediaType).toBe('box-2D');
        }
      });

      it('parses -m short flag for media', () => {
        const result = parseArgs(['scrape', '-m', 'ss']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.mediaType).toBe('ss');
        }
      });

      it('parses --region option', () => {
        const result = parseArgs(['scrape', '--region', 'us,eu,jp']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.regionPriority).toEqual(['us', 'eu', 'jp']);
        }
      });

      it('parses -r short flag for region', () => {
        const result = parseArgs(['scrape', '-r', 'wor,us']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.regionPriority).toEqual(['wor', 'us']);
        }
      });

      it('trims whitespace from region values', () => {
        const result = parseArgs(['scrape', '--region', 'us, eu , jp']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.regionPriority).toEqual(['us', 'eu', 'jp']);
        }
      });

      it('filters empty region values', () => {
        const result = parseArgs(['scrape', '--region', 'us,,eu']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.regionPriority).toEqual(['us', 'eu']);
        }
      });

      it('parses all scrape options together', () => {
        const result = parseArgs(['scrape', '-f', '-m', 'sstitle', '-r', 'jp,us', '-n']);
        expect(result.command).toBe('scrape');
        if (result.command === 'scrape') {
          expect(result.force).toBe(true);
          expect(result.mediaType).toBe('sstitle');
          expect(result.regionPriority).toEqual(['jp', 'us']);
          expect(result.dryRun).toBe(true);
        }
      });
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
