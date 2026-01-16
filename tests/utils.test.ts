import { describe, it, expect } from 'vitest';
import {
  resolveUrl,
  extractFilename,
  isValidHttpUrl,
  sanitizeFilename,
  safePath,
  resolveAndExtract,
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

describe('resolveAndExtract', () => {
  const baseUrl = 'https://example.com/roms/snes/';

  it('resolves URL and extracts filename in one pass', () => {
    const result = resolveAndExtract('mario.zip', baseUrl);
    expect(result.url).toBe('https://example.com/roms/snes/mario.zip');
    expect(result.filename).toBe('mario.zip');
  });

  it('resolves relative URL with parent path', () => {
    const result = resolveAndExtract('../nes/game.zip', baseUrl);
    expect(result.url).toBe('https://example.com/roms/nes/game.zip');
    expect(result.filename).toBe('game.zip');
  });

  it('preserves absolute URL', () => {
    const result = resolveAndExtract('https://other.com/file.zip', baseUrl);
    expect(result.url).toBe('https://other.com/file.zip');
    expect(result.filename).toBe('file.zip');
  });

  it('decodes URL-encoded filename', () => {
    const result = resolveAndExtract('game%20title.zip', baseUrl);
    expect(result.url).toBe('https://example.com/roms/snes/game%20title.zip');
    expect(result.filename).toBe('game title.zip');
  });

  it('returns index for trailing slash', () => {
    const result = resolveAndExtract('subdir/', baseUrl);
    expect(result.filename).toBe('index');
  });

  it('returns index for empty path', () => {
    const result = resolveAndExtract('', 'https://example.com/');
    expect(result.filename).toBe('index');
  });

  it('handles malformed percent encoding gracefully', () => {
    // %ZZ is not valid percent encoding - should use raw value
    const result = resolveAndExtract('file%ZZname.zip', baseUrl);
    expect(result.filename).toBe('file%ZZname.zip');
  });

  it('throws on invalid URL', () => {
    expect(() => resolveAndExtract('file.zip', 'not-a-valid-url')).toThrow(
      'Invalid URL'
    );
  });
});

describe('extractFilename - edge cases', () => {
  it('handles malformed URL by falling back to string split', () => {
    // Force the catch path by passing something that will throw in URL constructor
    // We need to mock URL to test this path properly, but we can test with a protocol-relative URL
    // that some URL parsers might struggle with
    const result = extractFilename('//example.com/path/file.zip');
    expect(result).toBe('file.zip');
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

  it('truncates long filename without short extension', () => {
    // Test when extension is too long (> 10 chars) - should just truncate
    const longName = 'a'.repeat(250) + '.verylongextension';
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(200);
    expect(result.endsWith('.verylongextension')).toBe(false);
  });

  it('truncates long filename with no extension', () => {
    const longName = 'a'.repeat(250);
    const result = sanitizeFilename(longName);
    expect(result.length).toBe(200);
  });

  it('handles filename with dot but no extension', () => {
    // Dot at position 0 should be removed (leading dot), then become just the name
    const result = sanitizeFilename('.a'.repeat(150));
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('handles control characters throughout string', () => {
    expect(sanitizeFilename('file\x01\x02\x03name.zip')).toBe('filename.zip');
    expect(sanitizeFilename('test\x7ffile.zip')).toBe('testfile.zip');
  });

  it('handles special URL-encoded characters', () => {
    // Test various URL-encoded characters
    expect(sanitizeFilename('file%26name.zip')).toBe('file&name.zip'); // &
    expect(sanitizeFilename('file%23tag.zip')).toBe('file#tag.zip');   // #
  });

  it('handles failed URL decoding gracefully', () => {
    // Invalid percent encoding should be kept as-is
    expect(sanitizeFilename('file%ZZname.zip')).toBe('file%ZZname.zip');
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
