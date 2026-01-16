import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../src/config/index.js';

const TEST_DIR = join(process.cwd(), '.test-config');
const TEST_CONFIG_PATH = join(TEST_DIR, 'test.config.json');

describe('config loader', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads valid config', () => {
    const validConfig = {
      urls: ['https://example.com/'],
      tableId: 'list',
      downloadDir: './downloads',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(validConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.urls).toEqual(['https://example.com/']);
    expect(config.tableId).toBe('list');
    expect(config.downloadDir).toBe('./downloads');
  });

  it('applies default values', () => {
    const minimalConfig = {
      urls: ['https://example.com/'],
      tableId: 'list',
      downloadDir: './downloads',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(minimalConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.whitelist).toEqual([]);
    expect(config.blacklist).toEqual([]);
    expect(config.concurrency).toBe(1);
    expect(config.retries).toBe(2);
    expect(config.requestTimeoutMs).toBe(30000);
    expect(config.logLevel).toBe('info');
  });

  it('throws on missing config file', () => {
    expect(() => loadConfig('/nonexistent/path.json')).toThrow('Config file not found');
  });

  it('throws on read permission error', () => {
    const noReadPath = join(TEST_DIR, 'noread.config.json');
    writeFileSync(noReadPath, '{}');
    chmodSync(noReadPath, 0o000); // Remove all permissions

    try {
      expect(() => loadConfig(noReadPath)).toThrow('Failed to read config file');
    } finally {
      // Restore permissions so cleanup works
      chmodSync(noReadPath, 0o644);
    }
  });

  it('throws on reading a directory as file', () => {
    const dirPath = join(TEST_DIR, 'subdir');
    mkdirSync(dirPath);

    expect(() => loadConfig(dirPath)).toThrow('Failed to read config file');
  });

  it('throws on invalid JSON', () => {
    writeFileSync(TEST_CONFIG_PATH, 'not valid json {{{');

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Invalid JSON');
  });

  it('throws on missing required fields', () => {
    const invalidConfig = {
      tableId: 'list',
      downloadDir: './downloads',
      // missing urls
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on invalid URL format', () => {
    const invalidConfig = {
      urls: ['not-a-valid-url'],
      tableId: 'list',
      downloadDir: './downloads',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on empty urls array', () => {
    const invalidConfig = {
      urls: [],
      tableId: 'list',
      downloadDir: './downloads',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on concurrency out of range', () => {
    const invalidConfig = {
      urls: ['https://example.com/'],
      tableId: 'list',
      downloadDir: './downloads',
      concurrency: 100,
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('accepts all valid log levels', () => {
    for (const logLevel of ['debug', 'info', 'silent']) {
      const config = {
        urls: ['https://example.com/'],
        tableId: 'list',
        downloadDir: './downloads',
        logLevel,
      };
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config));

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.logLevel).toBe(logLevel);
    }
  });

  it('loads full config with all options', () => {
    const fullConfig = {
      urls: ['https://example.com/', 'https://other.com/'],
      tableId: 'files',
      downloadDir: '/tmp/downloads',
      whitelist: ['mario', 'zelda'],
      blacklist: ['demo'],
      concurrency: 4,
      userAgent: 'TestAgent/1.0',
      requestTimeoutMs: 60000,
      retries: 5,
      logLevel: 'debug',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(fullConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config).toMatchObject(fullConfig);
  });
});
