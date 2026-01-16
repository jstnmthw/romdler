import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ensureDir,
  fileExists,
  getFileSize,
  atomicMove,
  safeDelete,
} from '../src/utils/index.js';

const TEST_DIR = join(process.cwd(), '.test-fs');

describe('fs utilities', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('ensureDir', () => {
    it('creates directory if it does not exist', async () => {
      const newDir = join(TEST_DIR, 'new-dir');

      await ensureDir(newDir);

      expect(existsSync(newDir)).toBe(true);
    });

    it('creates nested directories', async () => {
      const nestedDir = join(TEST_DIR, 'a', 'b', 'c');

      await ensureDir(nestedDir);

      expect(existsSync(nestedDir)).toBe(true);
    });

    it('does not throw if directory already exists', async () => {
      await ensureDir(TEST_DIR);

      // Should not throw
      await expect(ensureDir(TEST_DIR)).resolves.toBeUndefined();
    });
  });

  describe('fileExists', () => {
    it('returns true for existing file', async () => {
      const filePath = join(TEST_DIR, 'existing.txt');
      writeFileSync(filePath, 'content');

      expect(await fileExists(filePath)).toBe(true);
    });

    it('returns false for non-existing file', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt');

      expect(await fileExists(filePath)).toBe(false);
    });

    it('returns false for directory', async () => {
      expect(await fileExists(TEST_DIR)).toBe(false);
    });
  });

  describe('getFileSize', () => {
    it('returns file size in bytes', async () => {
      const filePath = join(TEST_DIR, 'sized.txt');
      const content = 'Hello, World!';
      writeFileSync(filePath, content);

      const size = await getFileSize(filePath);

      expect(size).toBe(content.length);
    });

    it('returns null for non-existing file', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt');

      const size = await getFileSize(filePath);

      expect(size).toBeNull();
    });

    it('handles empty file', async () => {
      const filePath = join(TEST_DIR, 'empty.txt');
      writeFileSync(filePath, '');

      const size = await getFileSize(filePath);

      expect(size).toBe(0);
    });
  });

  describe('atomicMove', () => {
    it('moves file from source to destination', async () => {
      const sourcePath = join(TEST_DIR, 'source.txt');
      const destPath = join(TEST_DIR, 'dest.txt');
      writeFileSync(sourcePath, 'content');

      await atomicMove(sourcePath, destPath);

      expect(existsSync(sourcePath)).toBe(false);
      expect(existsSync(destPath)).toBe(true);
    });

    it('creates destination directory if needed', async () => {
      const sourcePath = join(TEST_DIR, 'source.txt');
      const destPath = join(TEST_DIR, 'subdir', 'dest.txt');
      writeFileSync(sourcePath, 'content');

      await atomicMove(sourcePath, destPath);

      expect(existsSync(destPath)).toBe(true);
    });

    it('overwrites existing destination', async () => {
      const sourcePath = join(TEST_DIR, 'source.txt');
      const destPath = join(TEST_DIR, 'dest.txt');
      writeFileSync(sourcePath, 'new content');
      writeFileSync(destPath, 'old content');

      await atomicMove(sourcePath, destPath);

      expect(existsSync(destPath)).toBe(true);
    });
  });

  describe('safeDelete', () => {
    it('deletes existing file', async () => {
      const filePath = join(TEST_DIR, 'to-delete.txt');
      writeFileSync(filePath, 'content');

      await safeDelete(filePath);

      expect(existsSync(filePath)).toBe(false);
    });

    it('does not throw for non-existing file', async () => {
      const filePath = join(TEST_DIR, 'nonexistent.txt');

      // Should not throw
      await expect(safeDelete(filePath)).resolves.toBeUndefined();
    });
  });
});
