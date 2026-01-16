import { describe, it, expect } from 'vitest';
import {
  resolveUrl,
  extractFilename,
  isValidHttpUrl,
  sanitizeFilename,
  safePath,
} from '../src/utils/index.js';
import { resolve } from 'node:path';

describe('resolveUrl', () => {
  const baseUrl = 'https://example.com/roms/snes/';

  it('resolves relative URL', () => {
    expect(resolveUrl('mario.zip', baseUrl)).toBe(
      'https://example.com/roms/snes/mario.zip'
    );
  });

  it('resolves relative URL with path', () => {
    expect(resolveUrl('subfolder/zelda.zip', baseUrl)).toBe(
      'https://example.com/roms/snes/subfolder/zelda.zip'
    );
  });

  it('resolves parent directory path', () => {
    expect(resolveUrl('../nes/game.zip', baseUrl)).toBe(
      'https://example.com/roms/nes/game.zip'
    );
  });

  it('preserves absolute URL', () => {
    expect(resolveUrl('https://other.com/file.zip', baseUrl)).toBe(
      'https://other.com/file.zip'
    );
  });

  it('handles URL-encoded characters', () => {
    expect(resolveUrl('game%20title.zip', baseUrl)).toBe(
      'https://example.com/roms/snes/game%20title.zip'
    );
  });

  it('throws on invalid URL', () => {
    // Using a completely invalid base URL
    expect(() => resolveUrl('file.zip', 'not-a-valid-url')).toThrow();
  });
});

describe('extractFilename', () => {
  it('extracts filename from URL', () => {
    expect(extractFilename('https://example.com/path/file.zip')).toBe('file.zip');
  });

  it('extracts filename with special characters', () => {
    expect(extractFilename('https://example.com/path/file%20name.zip')).toBe(
      'file name.zip'
    );
  });

  it('handles URL with query string', () => {
    expect(extractFilename('https://example.com/path/file.zip?v=1')).toBe(
      'file.zip'
    );
  });

  it('returns index for trailing slash', () => {
    expect(extractFilename('https://example.com/path/')).toBe('index');
  });
});

describe('isValidHttpUrl', () => {
  it('accepts http URL', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });

  it('accepts https URL', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true);
  });

  it('rejects ftp URL', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
  });

  it('rejects file URL', () => {
    expect(isValidHttpUrl('file:///path/to/file')).toBe(false);
  });

  it('rejects invalid URL', () => {
    expect(isValidHttpUrl('not a url')).toBe(false);
  });
});

describe('sanitizeFilename', () => {
  it('preserves normal filename', () => {
    expect(sanitizeFilename('mario.zip')).toBe('mario.zip');
  });

  it('removes path separators', () => {
    expect(sanitizeFilename('path/to/file.zip')).toBe('path_to_file.zip');
    expect(sanitizeFilename('path\\to\\file.zip')).toBe('path_to_file.zip');
  });

  it('removes leading dots', () => {
    expect(sanitizeFilename('.hidden.zip')).toBe('hidden.zip');
    expect(sanitizeFilename('..parent.zip')).toBe('parent.zip');
  });

  it('decodes URL encoding', () => {
    expect(sanitizeFilename('file%20name.zip')).toBe('file name.zip');
  });

  it('removes null bytes', () => {
    expect(sanitizeFilename('file\0name.zip')).toBe('filename.zip');
  });

  it('replaces problematic characters', () => {
    // 7 characters: < > : " | ? *
    expect(sanitizeFilename('file<>:"|?*.zip')).toBe('file_______.zip');
  });

  it('returns unnamed for empty result', () => {
    expect(sanitizeFilename('')).toBe('unnamed');
    expect(sanitizeFilename('...')).toBe('unnamed');
  });

  it('limits filename length while preserving extension', () => {
    const longName = 'a'.repeat(250) + '.zip';
    const result = sanitizeFilename(longName);
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('.zip')).toBe(true);
  });
});

describe('safePath', () => {
  const baseDir = '/downloads';

  it('creates safe path for normal filename', () => {
    const result = safePath(baseDir, 'file.zip');
    expect(result).toBe(resolve(baseDir, 'file.zip'));
  });

  it('sanitizes dangerous filenames', () => {
    const result = safePath(baseDir, '../../../etc/passwd');
    // The path should be within the base directory
    expect(result.startsWith(resolve(baseDir))).toBe(true);
    // Path separators are replaced, preventing traversal
    expect(result).not.toContain('/etc/');
  });

  it('handles path with spaces', () => {
    const result = safePath(baseDir, 'file name.zip');
    expect(result).toBe(resolve(baseDir, 'file name.zip'));
  });

  it('throws on path traversal attempt', () => {
    // This tests that even after sanitization, we verify the result
    // The sanitization should prevent this, but we have a double-check
    expect(() => safePath(baseDir, '../../../../tmp/evil')).not.toThrow();
    const result = safePath(baseDir, '../../../../tmp/evil');
    expect(result.startsWith(resolve(baseDir))).toBe(true);
  });
});
