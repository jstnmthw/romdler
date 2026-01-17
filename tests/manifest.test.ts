import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LibretroManifest,
  getManifestInstance,
  clearManifestInstance,
} from '../src/scraper/libretro/manifest.js';
import { isSystemSupported } from '../src/scraper/libretro/systems.js';
import { sanitizeFilename, hasInvalidChars } from '../src/scraper/libretro/sanitizer.js';
import { LibretroAdapter, createLibretroAdapter } from '../src/scraper/libretro/adapter.js';

describe('LibretroManifest', () => {
  let manifest: LibretroManifest;

  beforeEach(() => {
    manifest = new LibretroManifest();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exactMatch', () => {
    it('finds exact match', () => {
      const entry = {
        filenames: new Set(['Super Mario Bros. (World)', 'Donkey Kong (Japan, USA)']),
        lowercaseMap: new Map([
          ['super mario bros. (world)', 'Super Mario Bros. (World)'],
          ['donkey kong (japan, usa)', 'Donkey Kong (Japan, USA)'],
        ]),
        fetchedAt: Date.now(),
      };

      expect(manifest.exactMatch(entry, 'Super Mario Bros. (World)')).toBe(
        'Super Mario Bros. (World)'
      );
      expect(manifest.exactMatch(entry, 'Donkey Kong (Japan, USA)')).toBe(
        'Donkey Kong (Japan, USA)'
      );
    });

    it('finds case-insensitive match', () => {
      const entry = {
        filenames: new Set(['Super Mario Bros. (World)']),
        lowercaseMap: new Map([['super mario bros. (world)', 'Super Mario Bros. (World)']]),
        fetchedAt: Date.now(),
      };

      expect(manifest.exactMatch(entry, 'super mario bros. (world)')).toBe(
        'Super Mario Bros. (World)'
      );
      expect(manifest.exactMatch(entry, 'SUPER MARIO BROS. (WORLD)')).toBe(
        'Super Mario Bros. (World)'
      );
    });

    it('returns null for no match', () => {
      const entry = {
        filenames: new Set(['Super Mario Bros. (World)']),
        lowercaseMap: new Map([['super mario bros. (world)', 'Super Mario Bros. (World)']]),
        fetchedAt: Date.now(),
      };

      expect(manifest.exactMatch(entry, 'Zelda (USA)')).toBeNull();
    });
  });

  describe('findMatch', () => {
    it('returns exact match with bestEffort=false', () => {
      const entry = {
        filenames: new Set(['Super Mario Bros. (World)']),
        lowercaseMap: new Map([['super mario bros. (world)', 'Super Mario Bros. (World)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Super Mario Bros. (World)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Super Mario Bros. (World)');
      expect(result!.bestEffort).toBe(false);
    });

    it('strips variant tags and finds match', () => {
      const entry = {
        filenames: new Set(['Aladdin (USA)']),
        lowercaseMap: new Map([['aladdin (usa)', 'Aladdin (USA)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Aladdin (USA) (Proto)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Aladdin (USA)');
      expect(result!.bestEffort).toBe(true);
    });

    it('strips multiple variant tags', () => {
      const entry = {
        filenames: new Set(['Airball (USA)']),
        lowercaseMap: new Map([['airball (usa)', 'Airball (USA)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Airball (USA) (Proto 1) (Unl)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Airball (USA)');
      expect(result!.bestEffort).toBe(true);
    });

    it('strips e-Reader suffix', () => {
      const entry = {
        filenames: new Set(['Donkey Kong (Japan, USA)']),
        lowercaseMap: new Map([['donkey kong (japan, usa)', 'Donkey Kong (Japan, USA)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Donkey Kong (USA) (Rev 1) (e-Reader)');
      // Should find by title matching
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Donkey Kong (Japan, USA)');
      expect(result!.bestEffort).toBe(true);
    });

    it('matches by title when region differs', () => {
      const entry = {
        filenames: new Set(['Ice Climber (World)', 'Ice Climber (Japan)']),
        lowercaseMap: new Map([
          ['ice climber (world)', 'Ice Climber (World)'],
          ['ice climber (japan)', 'Ice Climber (Japan)'],
        ]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Ice Climber (USA)');
      expect(result).not.toBeNull();
      expect(result!.bestEffort).toBe(true);
      // Should prefer World based on region priority
      expect(result!.match).toBe('Ice Climber (World)');
    });

    it('returns null when no match found', () => {
      const entry = {
        filenames: new Set(['Super Mario Bros. (World)']),
        lowercaseMap: new Map([['super mario bros. (world)', 'Super Mario Bros. (World)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Completely Unknown Game (USA)');
      expect(result).toBeNull();
    });

    it('strips BIOS prefix', () => {
      const entry = {
        filenames: new Set(['Demo Vision (USA)']),
        lowercaseMap: new Map([['demo vision (usa)', 'Demo Vision (USA)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, '[BIOS] Demo Vision (USA) (Rev 2)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Demo Vision (USA)');
      expect(result!.bestEffort).toBe(true);
    });

    it('strips Beta suffix', () => {
      const entry = {
        filenames: new Set(['Caveman Ninja (USA)']),
        lowercaseMap: new Map([['caveman ninja (usa)', 'Caveman Ninja (USA)']]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Caveman Ninja (USA) (Beta)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Caveman Ninja (USA)');
      expect(result!.bestEffort).toBe(true);
    });

    it('strips Retro-Bit publisher tag', () => {
      const entry = {
        filenames: new Set(["Hammerin' Harry (USA)"]),
        lowercaseMap: new Map([["hammerin' harry (usa)", "Hammerin' Harry (USA)"]]),
        fetchedAt: Date.now(),
      };

      // Title would be "Hammerin' Harry 2 - Dan the Red Strikes Back" - different game
      const result = manifest.findMatch(
        entry,
        "Hammerin' Harry 2 - Dan the Red Strikes Back (USA) (Retro-Bit)"
      );
      // Won't match because base title is different
      expect(result).toBeNull();
    });

    it('prefers World region when available', () => {
      const entry = {
        filenames: new Set(['Game (World)', 'Game (Japan)']),
        lowercaseMap: new Map([
          ['game (world)', 'Game (World)'],
          ['game (japan)', 'Game (Japan)'],
        ]),
        fetchedAt: Date.now(),
      };

      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (World)');
    });
  });

  describe('buildUrl', () => {
    it('builds correct CDN URL', () => {
      // System ID 3 = NES
      const url = manifest.buildUrl(3, 'box-2D', 'Super Mario Bros. (World)');
      expect(url).toBe(
        'https://thumbnails.libretro.com/Nintendo%20-%20Nintendo%20Entertainment%20System/Named_Boxarts/Super%20Mario%20Bros.%20(World).png'
      );
    });

    it('returns null for unsupported system', () => {
      const url = manifest.buildUrl(9999, 'box-2D', 'Game');
      expect(url).toBeNull();
    });

    it('handles different media types', () => {
      const boxUrl = manifest.buildUrl(3, 'box-2D', 'Game');
      const snapUrl = manifest.buildUrl(3, 'ss', 'Game');
      const titleUrl = manifest.buildUrl(3, 'sstitle', 'Game');

      expect(boxUrl).toContain('Named_Boxarts');
      expect(snapUrl).toContain('Named_Snaps');
      expect(titleUrl).toContain('Named_Titles');
    });
  });

  describe('prefetch', () => {
    it('throws for unsupported system ID', async () => {
      await expect(manifest.prefetch(9999)).rejects.toThrow('Unsupported system ID: 9999');
    });

    it('throws on 403 rate limit error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      await expect(manifest.prefetch(3)).rejects.toThrow('GitHub API rate limit exceeded');
    });

    it('throws on 404 not found error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      await expect(manifest.prefetch(3)).rejects.toThrow('System not found on Libretro');
    });

    it('throws on other HTTP errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(manifest.prefetch(3)).rejects.toThrow('GitHub API error: 500');
    });

    it('throws on network errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      await expect(manifest.prefetch(3)).rejects.toThrow('Failed to fetch manifest');
    });

    it('caches successful fetch', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [
            { path: 'Named_Boxarts/Game (USA).png', type: 'blob' },
            { path: 'Named_Snaps/Game (USA).png', type: 'blob' },
          ],
        }),
      } as unknown as Response;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      await manifest.prefetch(3);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await manifest.prefetch(3);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('skips fetch if already cached', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [{ path: 'Named_Boxarts/Game (USA).png', type: 'blob' }],
        }),
      } as unknown as Response;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

      // First prefetch
      await manifest.prefetch(3);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second prefetch should skip
      await manifest.prefetch(3);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getManifest', () => {
    it('returns null for unsupported system', async () => {
      const result = await manifest.getManifest(9999, 'box-2D');
      expect(result).toBeNull();
    });

    it('returns folder manifest after successful fetch', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [
            { path: 'Named_Boxarts/Super Mario Bros. (World).png', type: 'blob' },
            { path: 'Named_Boxarts/Zelda (USA).png', type: 'blob' },
          ],
        }),
      } as unknown as Response);

      const result = await manifest.getManifest(3, 'box-2D');
      expect(result).not.toBeNull();
      expect(result!.filenames.has('Super Mario Bros. (World)')).toBe(true);
      expect(result!.filenames.has('Zelda (USA)')).toBe(true);
    });

    it('returns null for failed fetch', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await manifest.getManifest(3, 'box-2D');
      expect(result).toBeNull();
    });

    it('caches failed fetches to prevent retries', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      // First call fails
      const result1 = await manifest.getManifest(3, 'box-2D');
      expect(result1).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call should use cached failure, not retry
      const result2 = await manifest.getManifest(3, 'box-2D');
      expect(result2).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns cached manifest on subsequent calls', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [{ path: 'Named_Boxarts/Game.png', type: 'blob' }],
        }),
      } as unknown as Response);

      const result1 = await manifest.getManifest(3, 'box-2D');
      expect(result1).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const result2 = await manifest.getManifest(3, 'box-2D');
      expect(result2).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns null for folder not in manifest', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [{ path: 'Named_Boxarts/Game.png', type: 'blob' }],
        }),
      } as unknown as Response);

      // Request snaps but only boxarts exist
      const result = await manifest.getManifest(3, 'ss');
      expect(result).toBeNull();
    });

    it('returns 404 as null (not an error)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await manifest.getManifest(3, 'box-2D');
      expect(result).toBeNull();
    });

    it('filters non-png and directory entries', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [
            { path: 'Named_Boxarts/Game.png', type: 'blob' },
            { path: 'Named_Boxarts/README.md', type: 'blob' },
            { path: 'Named_Boxarts', type: 'tree' },
            { path: 'somefile.txt', type: 'blob' },
            { path: 'rootfile.png', type: 'blob' }, // PNG without folder
          ],
        }),
      } as unknown as Response);

      const result = await manifest.getManifest(3, 'box-2D');
      expect(result).not.toBeNull();
      expect(result!.filenames.size).toBe(1);
      expect(result!.filenames.has('Game')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('clears all cached manifests', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [{ path: 'Named_Boxarts/Game.png', type: 'blob' }],
        }),
      } as unknown as Response);

      await manifest.getManifest(3, 'box-2D');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      manifest.clearCache();

      await manifest.getManifest(3, 'box-2D');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('findMatch edge cases', () => {
    it('falls back to alphabetical when no region matches', () => {
      const entry = {
        filenames: new Set(['Game (Germany)', 'Game (France)']),
        lowercaseMap: new Map([
          ['game (germany)', 'Game (Germany)'],
          ['game (france)', 'Game (France)'],
        ]),
      };

      // Neither Germany nor France are in priority list
      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      // Should return first alphabetically
      expect(result!.match).toBe('Game (France)');
      expect(result!.bestEffort).toBe(true);
    });

    it('prefers matching original region when available via title match', () => {
      const entry = {
        // Manifest has versions with suffixes, but NOT the plain "Game (Japan)"
        // So variant-stripped "Game (Japan)" won't match, going to title-only
        filenames: new Set(['Game (Japan) (Alt)', 'Game (World)']),
        lowercaseMap: new Map([
          ['game (japan) (alt)', 'Game (Japan) (Alt)'],
          ['game (world)', 'Game (World)'],
        ]),
      };

      // Search for Japan region with Proto suffix
      // Stripped: "Game (Japan)" - NOT in manifest (only "Game (Japan) (Alt)" exists)
      // Title match finds both starting with "Game"
      // preferredRegion = 'japan' matches 'Game (Japan) (Alt)'
      const result = manifest.findMatch(entry, 'Game (Japan) (Proto)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (Japan) (Alt)');
    });

    it('handles USA, Europe joint region', () => {
      const entry = {
        filenames: new Set(['Game (USA, Europe)']),
        lowercaseMap: new Map([['game (usa, europe)', 'Game (USA, Europe)']]),
      };

      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (USA, Europe)');
    });

    it('handles Japan, USA joint region', () => {
      const entry = {
        filenames: new Set(['Game (Japan, USA)']),
        lowercaseMap: new Map([['game (japan, usa)', 'Game (Japan, USA)']]),
      };

      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (Japan, USA)');
    });

    it('returns single candidate without region check', () => {
      const entry = {
        filenames: new Set(['Game (Unknown Region)']),
        lowercaseMap: new Map([['game (unknown region)', 'Game (Unknown Region)']]),
      };

      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (Unknown Region)');
    });

    it('returns null when base title is empty', () => {
      const entry = {
        filenames: new Set(['Game (USA)']),
        lowercaseMap: new Map([['game (usa)', 'Game (USA)']]),
      };

      // Filename starting with ( has no title
      const result = manifest.findMatch(entry, '(USA)');
      expect(result).toBeNull();
    });

    it('handles Europe region in priority', () => {
      const entry = {
        filenames: new Set(['Game (Europe)']),
        lowercaseMap: new Map([['game (europe)', 'Game (Europe)']]),
      };

      const result = manifest.findMatch(entry, 'Game (USA)');
      expect(result).not.toBeNull();
      expect(result!.match).toBe('Game (Europe)');
    });

    it('returns null when extracted title is empty after trim', () => {
      const entry = {
        filenames: new Set(['Game (USA)']),
        lowercaseMap: new Map([['game (usa)', 'Game (USA)']]),
      };

      // Filename with only spaces before parenthesis
      const result = manifest.findMatch(entry, '   (USA)');
      expect(result).toBeNull();
    });

    it('uses cached manifest for different media types same system', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          tree: [
            { path: 'Named_Boxarts/Game.png', type: 'blob' },
            { path: 'Named_Snaps/Game.png', type: 'blob' },
          ],
        }),
      } as unknown as Response);

      // First call fetches
      const result1 = await manifest.getManifest(3, 'box-2D');
      expect(result1).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call for different media type uses same cached system manifest
      const result2 = await manifest.getManifest(3, 'ss');
      expect(result2).not.toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1 - used cache
    });
  });
});

describe('Singleton helpers', () => {
  afterEach(() => {
    clearManifestInstance();
  });

  it('getManifestInstance returns same instance', () => {
    const instance1 = getManifestInstance();
    const instance2 = getManifestInstance();
    expect(instance1).toBe(instance2);
  });

  it('getManifestInstance creates instance with options', () => {
    const instance = getManifestInstance({ userAgent: 'test/1.0', timeoutMs: 5000 });
    expect(instance).toBeInstanceOf(LibretroManifest);
  });

  it('clearManifestInstance resets singleton', () => {
    const instance1 = getManifestInstance();
    clearManifestInstance();
    const instance2 = getManifestInstance();
    expect(instance1).not.toBe(instance2);
  });

  it('clearManifestInstance handles null instance', () => {
    // Should not throw when called without existing instance
    clearManifestInstance();
    clearManifestInstance();
  });
});

describe('isSystemSupported', () => {
  it('returns true for supported system', () => {
    expect(isSystemSupported(3)).toBe(true); // NES
    expect(isSystemSupported(4)).toBe(true); // SNES
  });

  it('returns false for unsupported system', () => {
    expect(isSystemSupported(9999)).toBe(false);
    expect(isSystemSupported(0)).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('replaces invalid characters with underscore', () => {
    expect(sanitizeFilename("Q*Bert's Qubes (USA)")).toBe("Q_Bert's Qubes (USA)");
    expect(sanitizeFilename('What? Me Worry!')).toBe('What_ Me Worry!');
    expect(sanitizeFilename('Game/Name')).toBe('Game_Name');
    expect(sanitizeFilename('Test: The Game')).toBe('Test_ The Game');
  });

  it('leaves valid filenames unchanged', () => {
    expect(sanitizeFilename('Super Mario Bros. (USA)')).toBe('Super Mario Bros. (USA)');
    expect(sanitizeFilename("Zelda - Link's Awakening")).toBe("Zelda - Link's Awakening");
  });

  it('handles multiple invalid characters', () => {
    expect(sanitizeFilename('A*B/C:D')).toBe('A_B_C_D');
    expect(sanitizeFilename('<>?|')).toBe('____');
  });
});

describe('hasInvalidChars', () => {
  it('returns true for filenames with invalid chars', () => {
    expect(hasInvalidChars('Q*Bert')).toBe(true);
    expect(hasInvalidChars('What?')).toBe(true);
    expect(hasInvalidChars('A/B')).toBe(true);
    expect(hasInvalidChars('C:D')).toBe(true);
  });

  it('returns false for valid filenames', () => {
    expect(hasInvalidChars('Super Mario Bros.')).toBe(false);
    expect(hasInvalidChars("Link's Awakening")).toBe(false);
    expect(hasInvalidChars('Game (USA)')).toBe(false);
  });
});

describe('LibretroAdapter', () => {
  let adapter: LibretroAdapter;

  beforeEach(() => {
    adapter = new LibretroAdapter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct id and name', () => {
    expect(adapter.id).toBe('libretro');
    expect(adapter.name).toBe('Libretro Thumbnails');
  });

  it('has correct capabilities', () => {
    expect(adapter.capabilities.hashLookup).toBe(false);
    expect(adapter.capabilities.filenameLookup).toBe(true);
    expect(adapter.capabilities.mediaTypes).toContain('box-2D');
    expect(adapter.capabilities.platforms).toBeInstanceOf(Array);
  });

  it('initialize returns true', async () => {
    const result = await adapter.initialize();
    expect(result).toBe(true);
  });

  it('supportsSystem returns true for supported systems', () => {
    expect(adapter.supportsSystem(3)).toBe(true); // NES
    expect(adapter.supportsSystem(4)).toBe(true); // SNES
  });

  it('supportsSystem returns false for unsupported systems', () => {
    expect(adapter.supportsSystem(9999)).toBe(false);
  });

  it('getRateLimitDelay returns 50', () => {
    expect(adapter.getRateLimitDelay()).toBe(50);
  });

  it('lookup returns null when not initialized', async () => {
    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Game (USA).zip',
        stem: 'Game (USA)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });
    expect(result).toBeNull();
  });

  it('lookup returns found:false when manifest returns null', async () => {
    await adapter.initialize();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Game (USA).zip',
        stem: 'Game (USA)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).toEqual({ found: false });
  });

  it('lookup returns found:false when no match in manifest', async () => {
    await adapter.initialize();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        tree: [{ path: 'Named_Boxarts/Other Game.png', type: 'blob' }],
      }),
    } as unknown as Response);

    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Unknown Game (USA).zip',
        stem: 'Unknown Game (USA)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).toEqual({ found: false });
  });

  it('lookup returns match when found', async () => {
    await adapter.initialize();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        tree: [{ path: 'Named_Boxarts/Super Mario Bros. (World).png', type: 'blob' }],
      }),
    } as unknown as Response);

    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Super Mario Bros. (World).zip',
        stem: 'Super Mario Bros. (World)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).not.toBeNull();
    expect(result!.found).toBe(true);
    expect(result!.gameName).toBe('Super Mario Bros. (World)');
    expect(result!.mediaUrl).toContain('thumbnails.libretro.com');
  });

  it('lookup returns bestEffort for fuzzy match', async () => {
    await adapter.initialize();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        tree: [{ path: 'Named_Boxarts/Game (World).png', type: 'blob' }],
      }),
    } as unknown as Response);

    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Game (USA) (Proto).zip',
        stem: 'Game (USA) (Proto)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).not.toBeNull();
    expect(result!.found).toBe(true);
    expect(result!.bestEffort).toBe(true);
    expect(result!.originalName).toBe('Game (USA) (Proto)');
  });

  it('dispose clears initialized state', async () => {
    await adapter.initialize();
    await adapter.dispose();

    const result = await adapter.lookup({
      rom: { path: '/test.zip', filename: 'Game.zip', stem: 'Game', extension: '.zip', size: 1000 },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).toBeNull();
  });

  it('prefetch calls manifest prefetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        tree: [{ path: 'Named_Boxarts/Game.png', type: 'blob' }],
      }),
    } as unknown as Response);

    await adapter.prefetch(3);
    // If we get here without throwing, prefetch succeeded
    expect(true).toBe(true);
  });

  it('lookup returns found:false when buildUrl returns null', async () => {
    await adapter.initialize();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        tree: [{ path: 'Named_Boxarts/Game (USA).png', type: 'blob' }],
      }),
    } as unknown as Response);

    // Use unsupported system (9999) after caching manifest for system 3
    // First lookup to cache manifest for system 3
    await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Game (USA).zip',
        stem: 'Game (USA)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 3,
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    // Now try with unsupported system - manifest won't have it
    const result = await adapter.lookup({
      rom: {
        path: '/test.zip',
        filename: 'Game (USA).zip',
        stem: 'Game (USA)',
        extension: '.zip',
        size: 1000,
      },
      systemId: 9999, // Unsupported system
      mediaType: 'box-2D',
      regionPriority: ['us'],
    });

    expect(result).toEqual({ found: false });
  });
});

describe('createLibretroAdapter', () => {
  it('creates adapter with default options', () => {
    const adapter = createLibretroAdapter();
    expect(adapter.id).toBe('libretro');
  });

  it('creates adapter with custom options', () => {
    const adapter = createLibretroAdapter({
      userAgent: 'custom/1.0',
      timeoutMs: 5000,
    });
    expect(adapter.id).toBe('libretro');
  });
});
