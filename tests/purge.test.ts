import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanDownloadDir } from '../src/purge/scanner.js';

describe('purge/scanner', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `purge-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('scanDownloadDir', () => {
    it('returns empty array for empty directory', async () => {
      const result = await scanDownloadDir(testDir);
      expect(result).toEqual([]);
    });

    it('returns files in directory', async () => {
      await writeFile(join(testDir, 'game1.zip'), '');
      await writeFile(join(testDir, 'game2.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.filename)).toContain('game1.zip');
      expect(result.map((f) => f.filename)).toContain('game2.zip');
    });

    it('returns absolute paths', async () => {
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result[0]?.path).toBe(join(testDir, 'game.zip'));
    });

    it('skips hidden files', async () => {
      await writeFile(join(testDir, '.hidden'), '');
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]?.filename).toBe('game.zip');
    });

    it('skips files starting with dash', async () => {
      await writeFile(join(testDir, '-temp'), '');
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]?.filename).toBe('game.zip');
    });

    it('skips Imgs directory', async () => {
      await mkdir(join(testDir, 'Imgs'));
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]?.filename).toBe('game.zip');
    });

    it('skips imgs directory case-insensitively', async () => {
      await mkdir(join(testDir, 'imgs'));
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(1);
    });

    it('skips subdirectories', async () => {
      await mkdir(join(testDir, 'subdir'));
      await writeFile(join(testDir, 'game.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(1);
      expect(result[0]?.filename).toBe('game.zip');
    });

    it('sorts results by filename', async () => {
      await writeFile(join(testDir, 'zelda.zip'), '');
      await writeFile(join(testDir, 'mario.zip'), '');
      await writeFile(join(testDir, 'donkey.zip'), '');

      const result = await scanDownloadDir(testDir);

      expect(result.map((f) => f.filename)).toEqual(['donkey.zip', 'mario.zip', 'zelda.zip']);
    });

    it('throws error for non-existent directory', async () => {
      await expect(scanDownloadDir('/nonexistent/path')).rejects.toThrow('Directory not found');
    });

    it('throws error for permission denied', async () => {
      // Create a directory and remove read permissions
      const restrictedDir = join(testDir, 'restricted');
      await mkdir(restrictedDir);

      // Skip this test on Windows or if running as root
      if (process.platform === 'win32' || process.getuid?.() === 0) {
        return;
      }

      const { chmod } = await import('node:fs/promises');
      await chmod(restrictedDir, 0o000);

      try {
        await expect(scanDownloadDir(restrictedDir)).rejects.toThrow('Permission denied');
      } finally {
        // Restore permissions for cleanup
        await chmod(restrictedDir, 0o755);
      }
    });

    it('includes various file extensions', async () => {
      await writeFile(join(testDir, 'game.zip'), '');
      await writeFile(join(testDir, 'game.7z'), '');
      await writeFile(join(testDir, 'game.rar'), '');

      const result = await scanDownloadDir(testDir);

      expect(result).toHaveLength(3);
    });
  });
});
