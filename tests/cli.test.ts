import { describe, it, expect } from 'vitest';
import { parseArgs, getHelpText, getUsageText } from '../src/cli/index.js';

describe('CLI argument parser', () => {
  describe('parseArgs', () => {
    it('returns no command with empty args', () => {
      const result = parseArgs([]);

      expect(result.command).toBeUndefined();
    });

    describe('no command (TUI launch)', () => {
      it('returns undefined command when no command provided', () => {
        const result = parseArgs([]);
        expect(result.command).toBeUndefined();
      });

      it('parses --config when no command provided', () => {
        const result = parseArgs(['--config', './custom.json']);
        expect(result.command).toBeUndefined();
        if (result.command === undefined) {
          expect(result.configPath).toBe('./custom.json');
        }
      });

      it('parses -c short flag when no command provided', () => {
        const result = parseArgs(['-c', '/path/to/config.json']);
        expect(result.command).toBeUndefined();
        if (result.command === undefined) {
          expect(result.configPath).toBe('/path/to/config.json');
        }
      });

      it('returns undefined configPath when --config without value', () => {
        const result = parseArgs(['--config']);
        expect(result.command).toBeUndefined();
        if (result.command === undefined) {
          expect(result.configPath).toBeUndefined();
        }
      });

      it('ignores other flags when no command provided', () => {
        const result = parseArgs(['--dry-run', '-c', 'test.json']);
        expect(result.command).toBeUndefined();
        if (result.command === undefined) {
          expect(result.configPath).toBe('test.json');
        }
      });
    });

    describe('command parsing', () => {
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
        if (result.command === 'scrape') {
          expect(result.dryRun).toBe(true);
        }
      });

      it('parses flags after command', () => {
        const result = parseArgs(['purge', '--dry-run', '--limit', '5']);
        expect(result.command).toBe('purge');
        if (result.command === 'purge') {
          expect(result.dryRun).toBe(true);
          expect(result.limit).toBe(5);
        }
      });

      it('parses dedupe with flags', () => {
        const result = parseArgs(['dedupe', '-n', '-l', '10']);
        expect(result.command).toBe('dedupe');
        if (result.command === 'dedupe') {
          expect(result.dryRun).toBe(true);
          expect(result.limit).toBe(10);
        }
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

    describe('global options (require explicit command)', () => {
      it('parses --dry-run flag', () => {
        const result = parseArgs(['download', '--dry-run']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.dryRun).toBe(true);
        }
      });

      it('parses -n short flag for dry-run', () => {
        const result = parseArgs(['download', '-n']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.dryRun).toBe(true);
        }
      });

      it('parses --config with path', () => {
        const result = parseArgs(['download', '--config', './custom.json']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.configPath).toBe('./custom.json');
        }
      });

      it('parses -c short flag for config', () => {
        const result = parseArgs(['download', '-c', '/path/to/config.json']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.configPath).toBe('/path/to/config.json');
        }
      });

      it('parses --limit with positive integer', () => {
        const result = parseArgs(['download', '--limit', '10']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBe(10);
        }
      });

      it('parses -l short flag for limit', () => {
        const result = parseArgs(['download', '-l', '5']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBe(5);
        }
      });

      it('ignores --limit with zero value', () => {
        const result = parseArgs(['download', '--limit', '0']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBeUndefined();
        }
      });

      it('ignores --limit with negative value', () => {
        const result = parseArgs(['download', '--limit', '-5']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBeUndefined();
        }
      });

      it('ignores --limit with non-numeric value', () => {
        const result = parseArgs(['download', '--limit', 'abc']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBeUndefined();
        }
      });

      it('ignores --config without value', () => {
        const result = parseArgs(['download', '--config']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.configPath).toBeUndefined();
        }
      });

      it('ignores --config when next arg starts with dash', () => {
        const result = parseArgs(['download', '--config', '--dry-run']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.configPath).toBeUndefined();
          expect(result.dryRun).toBe(true);
        }
      });

      it('ignores --limit without value', () => {
        const result = parseArgs(['download', '--limit']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBeUndefined();
        }
      });

      it('parses multiple flags together', () => {
        const result = parseArgs([
          'download',
          '--dry-run',
          '--config',
          'test.json',
          '--limit',
          '3',
        ]);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.dryRun).toBe(true);
          expect(result.configPath).toBe('test.json');
          expect(result.limit).toBe(3);
        }
      });

      it('parses flags in any order', () => {
        const result = parseArgs(['download', '-l', '7', '-c', 'my.json', '-n']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.dryRun).toBe(true);
          expect(result.configPath).toBe('my.json');
          expect(result.limit).toBe(7);
        }
      });

      it('ignores unknown arguments', () => {
        const result = parseArgs(['download', '--unknown', 'value', '--dry-run']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.dryRun).toBe(true);
          expect(result.configPath).toBeUndefined();
          expect(result.limit).toBeUndefined();
        }
      });

      it('handles float values for limit by truncating', () => {
        const result = parseArgs(['download', '--limit', '5.9']);
        expect(result.command).toBe('download');
        if (result.command === 'download') {
          expect(result.limit).toBe(5);
        }
      });
    });

    describe('help command', () => {
      it('parses help command', () => {
        const result = parseArgs(['help']);
        expect(result.command).toBe('help');
      });

      it('parses --help flag', () => {
        const result = parseArgs(['--help']);
        expect(result.command).toBe('help');
      });

      it('parses -h short flag', () => {
        const result = parseArgs(['-h']);
        expect(result.command).toBe('help');
      });

      it('parses help with subcommand', () => {
        const result = parseArgs(['help', 'download']);
        expect(result.command).toBe('help');
        if (result.command === 'help') {
          expect(result.helpCommand).toBe('download');
        }
      });

      it('parses command with --help flag', () => {
        const result = parseArgs(['scrape', '--help']);
        expect(result.command).toBe('help');
        if (result.command === 'help') {
          expect(result.helpCommand).toBe('scrape');
        }
      });

      it('parses command with -h flag', () => {
        const result = parseArgs(['dedupe', '-h']);
        expect(result.command).toBe('help');
        if (result.command === 'help') {
          expect(result.helpCommand).toBe('dedupe');
        }
      });
    });
  });

  describe('getHelpText', () => {
    it('returns main help for undefined command', () => {
      const text = getHelpText(undefined);
      expect(text).toContain('romdler');
      expect(text).toContain('Commands:');
    });

    it('returns main help for help command', () => {
      const text = getHelpText('help');
      expect(text).toContain('romdler');
      expect(text).toContain('Commands:');
    });

    it('returns download help', () => {
      const text = getHelpText('download');
      expect(text).toContain('download');
      expect(text).toContain('Download ROM files');
    });

    it('returns scrape help', () => {
      const text = getHelpText('scrape');
      expect(text).toContain('scrape');
      expect(text).toContain('cover artwork');
    });

    it('returns purge help', () => {
      const text = getHelpText('purge');
      expect(text).toContain('purge');
      expect(text).toContain('blacklist');
    });

    it('returns dedupe help', () => {
      const text = getHelpText('dedupe');
      expect(text).toContain('dedupe');
      expect(text).toContain('duplicate');
    });
  });

  describe('getUsageText', () => {
    it('returns brief usage message', () => {
      const text = getUsageText();
      expect(text).toContain('Usage:');
      expect(text).toContain('pnpm cli');
      expect(text).toContain('help');
    });
  });
});
