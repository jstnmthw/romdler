import { describe, it, expect } from 'vitest';
import { parseRomFilename } from '../src/dedupe/parser.js';
import { groupRomsBySignature, analyzeGroup, getGroupsWithDuplicates } from '../src/dedupe/grouper.js';
import type { DedupeRomFile, RomGroup } from '../src/dedupe/types.js';

describe('dedupe/parser', () => {
  describe('parseRomFilename', () => {
    it('extracts title from filename', () => {
      const result = parseRomFilename('Super Mario World (USA).zip');
      expect(result.title).toBe('Super Mario World');
    });

    it('extracts title without parentheses', () => {
      const result = parseRomFilename('Game Title.zip');
      expect(result.title).toBe('Game Title');
    });

    it('extracts single region', () => {
      const result = parseRomFilename('Game (USA).zip');
      expect(result.regions).toEqual(['USA']);
    });

    it('extracts multiple regions', () => {
      const result = parseRomFilename('Game (USA) (Europe).zip');
      expect(result.regions).toEqual(['USA', 'Europe']);
    });

    it('recognizes all standard regions', () => {
      const regions = [
        'USA', 'Europe', 'Japan', 'World', 'Australia', 'Brazil',
        'Canada', 'China', 'France', 'Germany', 'Hong Kong', 'Italy',
        'Korea', 'Mexico', 'Netherlands', 'Russia', 'Spain', 'Sweden',
        'Taiwan', 'UK'
      ];

      for (const region of regions) {
        const result = parseRomFilename(`Game (${region}).zip`);
        expect(result.regions).toContain(region);
      }
    });

    describe('variant indicators', () => {
      it('detects Rev indicator', () => {
        const result = parseRomFilename('Game (USA) (Rev 1).zip');
        expect(result.variantIndicators).toContain('Rev 1');
        expect(result.isClean).toBe(false);
      });

      it('detects Rev with letter', () => {
        const result = parseRomFilename('Game (USA) (Rev A).zip');
        expect(result.variantIndicators).toContain('Rev A');
        expect(result.isClean).toBe(false);
      });

      it('detects Beta indicator', () => {
        const result = parseRomFilename('Game (USA) (Beta).zip');
        expect(result.variantIndicators).toContain('Beta');
        expect(result.isClean).toBe(false);
      });

      it('detects Beta with number', () => {
        const result = parseRomFilename('Game (USA) (Beta 2).zip');
        expect(result.variantIndicators).toContain('Beta 2');
        expect(result.isClean).toBe(false);
      });

      it('detects Proto indicator', () => {
        const result = parseRomFilename('Game (USA) (Proto).zip');
        expect(result.variantIndicators).toContain('Proto');
        expect(result.isClean).toBe(false);
      });

      it('detects Sample indicator', () => {
        const result = parseRomFilename('Game (USA) (Sample).zip');
        expect(result.variantIndicators).toContain('Sample');
        expect(result.isClean).toBe(false);
      });

      it('detects Demo indicator', () => {
        const result = parseRomFilename('Game (USA) (Demo).zip');
        expect(result.variantIndicators).toContain('Demo');
        expect(result.isClean).toBe(false);
      });

      it('detects Preview indicator', () => {
        const result = parseRomFilename('Game (USA) (Preview).zip');
        expect(result.variantIndicators).toContain('Preview');
        expect(result.isClean).toBe(false);
      });

      it('detects Promo indicator', () => {
        const result = parseRomFilename('Game (USA) (Promo).zip');
        expect(result.variantIndicators).toContain('Promo');
        expect(result.isClean).toBe(false);
      });

      it('detects dated builds (YYYY-MM-DD)', () => {
        const result = parseRomFilename('Game (USA) (2020-01-15).zip');
        expect(result.variantIndicators).toContain('2020-01-15');
        expect(result.isClean).toBe(false);
      });

      it('detects dated builds (YYYY.MM.DD)', () => {
        const result = parseRomFilename('Game (USA) (2020.01.15).zip');
        expect(result.variantIndicators).toContain('2020.01.15');
        expect(result.isClean).toBe(false);
      });

      it('detects Virtual Console re-release', () => {
        const result = parseRomFilename('Game (USA) (Virtual Console).zip');
        expect(result.variantIndicators).toContain('Virtual Console');
        expect(result.isClean).toBe(false);
      });

      it('detects GameCube Edition', () => {
        const result = parseRomFilename('Game (USA) (GameCube Edition).zip');
        expect(result.variantIndicators).toContain('GameCube Edition');
        expect(result.isClean).toBe(false);
      });

      it('detects GameCube', () => {
        const result = parseRomFilename('Game (USA) (GameCube).zip');
        expect(result.variantIndicators).toContain('GameCube');
        expect(result.isClean).toBe(false);
      });

      it('detects Switch Online', () => {
        const result = parseRomFilename('Game (USA) (Switch Online).zip');
        expect(result.variantIndicators).toContain('Switch Online');
        expect(result.isClean).toBe(false);
      });

      it('detects e-Reader', () => {
        const result = parseRomFilename('Game (USA) (e-Reader).zip');
        expect(result.variantIndicators).toContain('e-Reader');
        expect(result.isClean).toBe(false);
      });

      it('detects iam8bit', () => {
        const result = parseRomFilename('Game (USA) (iam8bit).zip');
        expect(result.variantIndicators).toContain('iam8bit');
        expect(result.isClean).toBe(false);
      });

      it('detects Retro-Bit', () => {
        const result = parseRomFilename('Game (USA) (Retro-Bit).zip');
        expect(result.variantIndicators).toContain('Retro-Bit');
        expect(result.isClean).toBe(false);
      });

      it('detects Classic NES Series', () => {
        const result = parseRomFilename('Game (USA) (Classic NES Series).zip');
        expect(result.variantIndicators).toContain('Classic NES Series');
        expect(result.isClean).toBe(false);
      });

      it('detects Famicom Mini', () => {
        const result = parseRomFilename('Game (Japan) (Famicom Mini).zip');
        expect(result.variantIndicators).toContain('Famicom Mini');
        expect(result.isClean).toBe(false);
      });

      it('detects Limited Run', () => {
        const result = parseRomFilename('Game (USA) (Limited Run).zip');
        expect(result.variantIndicators).toContain('Limited Run');
        expect(result.isClean).toBe(false);
      });

      it('detects Arcade Archives', () => {
        const result = parseRomFilename('Game (USA) (Arcade Archives).zip');
        expect(result.variantIndicators).toContain('Arcade Archives');
        expect(result.isClean).toBe(false);
      });

      it('detects Capcom Town', () => {
        const result = parseRomFilename('Game (USA) (Capcom Town).zip');
        expect(result.variantIndicators).toContain('Capcom Town');
        expect(result.isClean).toBe(false);
      });

      it('detects Animal Crossing', () => {
        const result = parseRomFilename('Game (USA) (Animal Crossing).zip');
        expect(result.variantIndicators).toContain('Animal Crossing');
        expect(result.isClean).toBe(false);
      });

      it('detects Wii U Virtual Console', () => {
        const result = parseRomFilename('Game (USA) (Wii U Virtual Console).zip');
        expect(result.variantIndicators).toContain('Wii U Virtual Console');
        expect(result.isClean).toBe(false);
      });

      it('detects 3DS Virtual Console', () => {
        const result = parseRomFilename('Game (USA) (3DS Virtual Console).zip');
        expect(result.variantIndicators).toContain('3DS Virtual Console');
        expect(result.isClean).toBe(false);
      });
    });

    describe('quality modifiers', () => {
      it('detects SGB Enhanced', () => {
        const result = parseRomFilename('Game (USA) (SGB Enhanced).zip');
        expect(result.qualityModifiers).toContain('SGB Enhanced');
        expect(result.isClean).toBe(true);
      });

      it('detects GB Compatible', () => {
        const result = parseRomFilename('Game (USA) (GB Compatible).zip');
        expect(result.qualityModifiers).toContain('GB Compatible');
        expect(result.isClean).toBe(true);
      });

      it('detects Rumble Version', () => {
        const result = parseRomFilename('Game (USA) (Rumble Version).zip');
        expect(result.qualityModifiers).toContain('Rumble Version');
        expect(result.isClean).toBe(true);
      });

      it('detects Unl (unlicensed)', () => {
        const result = parseRomFilename('Game (USA) (Unl).zip');
        expect(result.qualityModifiers).toContain('Unl');
        expect(result.isClean).toBe(true);
      });

      it('detects Pirate', () => {
        const result = parseRomFilename('Game (USA) (Pirate).zip');
        expect(result.qualityModifiers).toContain('Pirate');
        expect(result.isClean).toBe(true);
      });

      it('detects Aftermarket', () => {
        const result = parseRomFilename('Game (USA) (Aftermarket).zip');
        expect(result.qualityModifiers).toContain('Aftermarket');
        expect(result.isClean).toBe(true);
      });

      it('detects Alt', () => {
        const result = parseRomFilename('Game (USA) (Alt).zip');
        expect(result.qualityModifiers).toContain('Alt');
        expect(result.isClean).toBe(true);
      });

      it('detects Alt with number', () => {
        const result = parseRomFilename('Game (USA) (Alt 2).zip');
        expect(result.qualityModifiers).toContain('Alt 2');
        expect(result.isClean).toBe(true);
      });

      it('detects multi-language codes', () => {
        const result = parseRomFilename('Game (USA) (En,Fr,De).zip');
        expect(result.qualityModifiers).toContain('En,Fr,De');
        expect(result.isClean).toBe(true);
      });

      it('detects single language code En', () => {
        const result = parseRomFilename('Game (USA) (En).zip');
        expect(result.qualityModifiers).toContain('En');
        expect(result.isClean).toBe(true);
      });

      it('detects single language code Ja', () => {
        const result = parseRomFilename('Game (Japan) (Ja).zip');
        expect(result.qualityModifiers).toContain('Ja');
        expect(result.isClean).toBe(true);
      });

      it('detects enhancement chips SA-1', () => {
        const result = parseRomFilename('Game (USA) (SA-1).zip');
        expect(result.qualityModifiers).toContain('SA-1');
        expect(result.isClean).toBe(true);
      });

      it('detects enhancement chips SuperFX', () => {
        const result = parseRomFilename('Game (USA) (SuperFX).zip');
        expect(result.qualityModifiers).toContain('SuperFX');
        expect(result.isClean).toBe(true);
      });

      it('detects GBC', () => {
        const result = parseRomFilename('Game (USA) (GBC).zip');
        expect(result.qualityModifiers).toContain('GBC');
        expect(result.isClean).toBe(true);
      });
    });

    describe('clean detection', () => {
      it('marks file without variant indicators as clean', () => {
        const result = parseRomFilename('Super Mario World (USA).zip');
        expect(result.isClean).toBe(true);
      });

      it('marks file with variant indicator as not clean', () => {
        const result = parseRomFilename('Super Mario World (USA) (Rev 1).zip');
        expect(result.isClean).toBe(false);
      });

      it('file with quality modifier only is clean', () => {
        const result = parseRomFilename('Game (USA) (SGB Enhanced).zip');
        expect(result.isClean).toBe(true);
      });

      it('file with quality modifier and variant is not clean', () => {
        const result = parseRomFilename('Game (USA) (SGB Enhanced) (Rev 1).zip');
        expect(result.isClean).toBe(false);
      });
    });

    describe('base signature', () => {
      it('creates consistent signature for same game', () => {
        const result1 = parseRomFilename('Super Mario World (USA).zip');
        const result2 = parseRomFilename('Super Mario World (USA) (Rev 1).zip');
        expect(result1.baseSignature).toBe(result2.baseSignature);
      });

      it('creates different signatures for different regions', () => {
        const result1 = parseRomFilename('Game (USA).zip');
        const result2 = parseRomFilename('Game (Europe).zip');
        expect(result1.baseSignature).not.toBe(result2.baseSignature);
      });

      it('creates different signatures for different quality modifiers', () => {
        const result1 = parseRomFilename('Game (USA).zip');
        const result2 = parseRomFilename('Game (USA) (SGB Enhanced).zip');
        expect(result1.baseSignature).not.toBe(result2.baseSignature);
      });

      it('normalizes title case', () => {
        const result1 = parseRomFilename('GAME (USA).zip');
        const result2 = parseRomFilename('game (USA).zip');
        expect(result1.baseSignature).toBe(result2.baseSignature);
      });

      it('sorts regions in signature', () => {
        const result1 = parseRomFilename('Game (USA) (Europe).zip');
        const result2 = parseRomFilename('Game (Europe) (USA).zip');
        expect(result1.baseSignature).toBe(result2.baseSignature);
      });

      it('sorts quality modifiers in signature', () => {
        const result1 = parseRomFilename('Game (USA) (SGB Enhanced) (En,Fr).zip');
        const result2 = parseRomFilename('Game (USA) (En,Fr) (SGB Enhanced).zip');
        expect(result1.baseSignature).toBe(result2.baseSignature);
      });
    });

    it('preserves original filename', () => {
      const filename = 'Super Mario World (USA) (Rev 1).zip';
      const result = parseRomFilename(filename);
      expect(result.filename).toBe(filename);
    });

    it('tracks unrecognized tokens as extras', () => {
      const result = parseRomFilename('Game (USA) (Unknown Token).zip');
      expect(result.regions).toEqual(['USA']);
      expect(result.qualityModifiers).toEqual([]);
      expect(result.variantIndicators).toEqual([]);
      expect(result.extraTokens).toEqual(['Unknown Token']);
      expect(result.isClean).toBe(false); // Extra tokens make it not clean
    });

    it('tracks square bracket tokens as extras', () => {
      const result = parseRomFilename('Game (USA) [b].zip');
      expect(result.regions).toEqual(['USA']);
      expect(result.extraTokens).toEqual(['[b]']);
      expect(result.isClean).toBe(false);
    });

    it('detects Retro-Bit Generations as variant', () => {
      const result = parseRomFilename('Game (USA) (Retro-Bit Generations).zip');
      expect(result.variantIndicators).toContain('Retro-Bit Generations');
      expect(result.isClean).toBe(false);
    });

    it('detects Capcom Classics Mini Mix as variant', () => {
      const result = parseRomFilename('Game (USA) (Capcom Classics Mini Mix).zip');
      expect(result.variantIndicators).toContain('Capcom Classics Mini Mix');
      expect(result.isClean).toBe(false);
    });

    describe('extra tokens', () => {
      it('tracks multiple unrecognized tokens', () => {
        const result = parseRomFilename('Game (USA) (Foo) (Bar).zip');
        expect(result.extraTokens).toEqual(['Foo', 'Bar']);
        expect(result.isClean).toBe(false);
      });

      it('tracks multiple bracket tokens', () => {
        const result = parseRomFilename('Game (USA) [b] [o1].zip');
        expect(result.extraTokens).toContain('[b]');
        expect(result.extraTokens).toContain('[o1]');
        expect(result.isClean).toBe(false);
      });

      it('tracks common ROM status bracket codes', () => {
        // [!] = verified good dump, [b] = bad dump, [h] = hack, [o] = overdump
        const codes = ['!', 'b', 'h', 'o', 'a', 't', 'f', 'p'];
        for (const code of codes) {
          const result = parseRomFilename(`Game (USA) [${code}].zip`);
          expect(result.extraTokens).toContain(`[${code}]`);
        }
      });

      it('combines bracket and paren extra tokens', () => {
        const result = parseRomFilename('Game (USA) (Unknown) [b].zip');
        expect(result.extraTokens).toEqual(['Unknown', '[b]']);
        expect(result.isClean).toBe(false);
      });

      it('has empty extraTokens for clean file', () => {
        const result = parseRomFilename('Game (USA).zip');
        expect(result.extraTokens).toEqual([]);
        expect(result.isClean).toBe(true);
      });

      it('has empty extraTokens for file with only known modifiers', () => {
        const result = parseRomFilename('Game (USA) (SGB Enhanced) (En,Fr).zip');
        expect(result.extraTokens).toEqual([]);
        expect(result.isClean).toBe(true);
      });
    });

    describe('compilation and re-release variants', () => {
      it('detects Genesis Mini as variant', () => {
        const result = parseRomFilename('Game (USA) (Genesis Mini).zip');
        expect(result.variantIndicators).toContain('Genesis Mini');
        expect(result.isClean).toBe(false);
      });

      it('detects SNES Classic as variant', () => {
        const result = parseRomFilename('Game (USA) (SNES Classic).zip');
        expect(result.variantIndicators).toContain('SNES Classic');
        expect(result.isClean).toBe(false);
      });

      it('detects NES Classic as variant', () => {
        const result = parseRomFilename('Game (USA) (NES Classic).zip');
        expect(result.variantIndicators).toContain('NES Classic');
        expect(result.isClean).toBe(false);
      });

      it('detects Namco Museum as variant', () => {
        const result = parseRomFilename('Game (USA) (Namco Museum Archives).zip');
        expect(result.variantIndicators).toContain('Namco Museum Archives');
        expect(result.isClean).toBe(false);
      });

      it('detects Mega Man Legacy as variant', () => {
        const result = parseRomFilename('Game (USA) (Mega Man Legacy Collection).zip');
        expect(result.variantIndicators).toContain('Mega Man Legacy Collection');
        expect(result.isClean).toBe(false);
      });

      it('detects NSO abbreviated as variant', () => {
        const result = parseRomFilename('Game (USA) (NSO).zip');
        expect(result.variantIndicators).toContain('NSO');
        expect(result.isClean).toBe(false);
      });
    });
  });
});

describe('dedupe/grouper', () => {
  function createRomFile(filename: string): DedupeRomFile {
    return {
      path: `/roms/${filename}`,
      filename,
      parsed: parseRomFilename(filename),
    };
  }

  describe('groupRomsBySignature', () => {
    it('groups files with same signature', () => {
      const files = [
        createRomFile('Game (USA).zip'),
        createRomFile('Game (USA) (Rev 1).zip'),
        createRomFile('Game (USA) (Beta).zip'),
      ];

      const groups = groupRomsBySignature(files);
      expect(groups.size).toBe(1);

      const group = Array.from(groups.values())[0];
      expect(group).toHaveLength(3);
    });

    it('separates files with different signatures', () => {
      const files = [
        createRomFile('Game A (USA).zip'),
        createRomFile('Game B (USA).zip'),
        createRomFile('Game A (Europe).zip'),
      ];

      const groups = groupRomsBySignature(files);
      expect(groups.size).toBe(3);
    });

    it('handles empty input', () => {
      const groups = groupRomsBySignature([]);
      expect(groups.size).toBe(0);
    });

    it('handles single file', () => {
      const files = [createRomFile('Game (USA).zip')];
      const groups = groupRomsBySignature(files);
      expect(groups.size).toBe(1);
    });
  });

  describe('analyzeGroup', () => {
    it('identifies clean version as preferred', () => {
      const files = [
        createRomFile('Game (USA).zip'),
        createRomFile('Game (USA) (Rev 1).zip'),
      ];

      const result = analyzeGroup('test', files);

      expect(result.preferred).not.toBeNull();
      expect(result.preferred?.filename).toBe('Game (USA).zip');
    });

    it('marks variants for removal when clean exists', () => {
      const files = [
        createRomFile('Game (USA).zip'),
        createRomFile('Game (USA) (Rev 1).zip'),
        createRomFile('Game (USA) (Beta).zip'),
      ];

      const result = analyzeGroup('test', files);

      expect(result.toRemove).toHaveLength(2);
      expect(result.toKeep).toHaveLength(1);
    });

    it('keeps all files when no clean version exists', () => {
      const files = [
        createRomFile('Game (USA) (Rev 1).zip'),
        createRomFile('Game (USA) (Beta).zip'),
      ];

      const result = analyzeGroup('test', files);

      expect(result.preferred).toBeNull();
      expect(result.toRemove).toHaveLength(0);
      expect(result.toKeep).toHaveLength(2);
    });

    it('keeps multiple clean versions when they exist in same group', () => {
      // This tests the loop at lines 73-77 that handles additional clean versions
      // We need to manually create files that have the same signature but are both clean
      // This happens when groupRomsBySignature puts them together
      const cleanFile1 = createRomFile('Game (USA).zip');
      const cleanFile2 = createRomFile('Game (USA).zip'); // Duplicate clean
      cleanFile2.filename = 'Game (USA) Copy.zip'; // Make it distinguishable
      cleanFile2.path = '/roms/Game (USA) Copy.zip';

      const files = [cleanFile1, cleanFile2];
      const result = analyzeGroup('test', files);

      // Both should be kept since both are clean
      expect(result.toKeep).toHaveLength(2);
      expect(result.toRemove).toHaveLength(0);
    });

    it('sorts clean versions before variants', () => {
      // This tests the sort comparison at lines 40-44
      // Provide files in reverse order (variant first) to trigger sorting
      const files = [
        createRomFile('Game (USA) (Rev 1).zip'), // Variant first
        createRomFile('Game (USA).zip'), // Clean second
      ];

      const result = analyzeGroup('test', files);

      // The clean version should be preferred (sorted first)
      expect(result.preferred?.filename).toBe('Game (USA).zip');
      expect(result.toKeep).toHaveLength(1);
      expect(result.toKeep[0]?.filename).toBe('Game (USA).zip');
    });

    it('sorts variants by filename when both are variants', () => {
      // Both are variants, so sort by filename
      const files = [
        createRomFile('Game (USA) (Rev 2).zip'),
        createRomFile('Game (USA) (Rev 1).zip'),
      ];

      const result = analyzeGroup('test', files);

      // Should be sorted alphabetically
      expect(result.toKeep).toHaveLength(2);
      expect(result.toKeep[0]?.filename).toBe('Game (USA) (Rev 1).zip');
      expect(result.toKeep[1]?.filename).toBe('Game (USA) (Rev 2).zip');
    });

    it('sets display title from first file', () => {
      const files = [
        createRomFile('Super Mario World (USA).zip'),
        createRomFile('Super Mario World (USA) (Rev 1).zip'),
      ];

      const result = analyzeGroup('test', files);
      expect(result.displayTitle).toBe('Super Mario World');
    });

    it('identifies all variants', () => {
      const files = [
        createRomFile('Game (USA).zip'),
        createRomFile('Game (USA) (Rev 1).zip'),
        createRomFile('Game (USA) (Beta).zip'),
        createRomFile('Game (USA) (Proto).zip'),
      ];

      const result = analyzeGroup('test', files);
      expect(result.variants).toHaveLength(3);
    });

    it('handles empty file list', () => {
      const result = analyzeGroup('test', []);
      expect(result.preferred).toBeNull();
      expect(result.displayTitle).toBe('Unknown');
      expect(result.toRemove).toHaveLength(0);
      expect(result.toKeep).toHaveLength(0);
    });

    it('prefers file without extra tokens over file with extra tokens', () => {
      // File with unrecognized token should be less preferred
      const files = [
        createRomFile('Game (USA) (Unknown Token).zip'), // Has extra token
        createRomFile('Game (USA).zip'), // Clean
      ];

      const result = analyzeGroup('test', files);

      expect(result.preferred?.filename).toBe('Game (USA).zip');
      expect(result.toRemove).toHaveLength(1);
      expect(result.toRemove[0]?.filename).toBe('Game (USA) (Unknown Token).zip');
    });

    it('prefers file without bracket tokens over file with bracket tokens', () => {
      const files = [
        createRomFile('Game (USA) [b].zip'), // Has bracket token
        createRomFile('Game (USA).zip'), // Clean
      ];

      const result = analyzeGroup('test', files);

      expect(result.preferred?.filename).toBe('Game (USA).zip');
      expect(result.toRemove).toHaveLength(1);
      expect(result.toRemove[0]?.filename).toBe('Game (USA) [b].zip');
    });

    it('removes compilation variants when clean exists', () => {
      const files = [
        createRomFile('Game (USA).zip'),
        createRomFile('Game (USA) (Capcom Classics Mini Mix).zip'),
        createRomFile('Game (USA) (Retro-Bit Generations).zip'),
      ];

      const result = analyzeGroup('test', files);

      expect(result.preferred?.filename).toBe('Game (USA).zip');
      expect(result.toRemove).toHaveLength(2);
      expect(result.toKeep).toHaveLength(1);
    });

    it('keeps files with extra tokens when no clean version exists', () => {
      // All files have extra tokens or variants
      const files = [
        createRomFile('Game (USA) [b].zip'),
        createRomFile('Game (USA) (Beta).zip'),
      ];

      const result = analyzeGroup('test', files);

      // No clean version, so keep all
      expect(result.preferred).toBeNull();
      expect(result.toRemove).toHaveLength(0);
      expect(result.toKeep).toHaveLength(2);
    });
  });

  describe('getGroupsWithDuplicates', () => {
    it('returns only groups with files to remove', () => {
      const groupWithDupes: RomGroup = {
        signature: 'a',
        displayTitle: 'Game A',
        preferred: createRomFile('Game A (USA).zip'),
        variants: [createRomFile('Game A (USA) (Rev 1).zip')],
        toRemove: [createRomFile('Game A (USA) (Rev 1).zip')],
        toKeep: [createRomFile('Game A (USA).zip')],
      };

      const groupWithoutDupes: RomGroup = {
        signature: 'b',
        displayTitle: 'Game B',
        preferred: createRomFile('Game B (USA).zip'),
        variants: [],
        toRemove: [],
        toKeep: [createRomFile('Game B (USA).zip')],
      };

      const result = getGroupsWithDuplicates([groupWithDupes, groupWithoutDupes]);

      expect(result).toHaveLength(1);
      expect(result[0]?.displayTitle).toBe('Game A');
    });

    it('returns empty array when no duplicates', () => {
      const group: RomGroup = {
        signature: 'a',
        displayTitle: 'Game',
        preferred: createRomFile('Game (USA).zip'),
        variants: [],
        toRemove: [],
        toKeep: [createRomFile('Game (USA).zip')],
      };

      const result = getGroupsWithDuplicates([group]);
      expect(result).toHaveLength(0);
    });
  });
});
