import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, resolveSystemConfig } from '../src/config/index.js';

const TEST_DIR = join(process.cwd(), '.test-config');
const TEST_CONFIG_PATH = join(TEST_DIR, 'test.config.json');

describe('config loader', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads valid config with systems array', () => {
    const validConfig = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(validConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.systems).toHaveLength(1);
    expect(config.systems[0]?.system).toBe('gbc');
    expect(config.systems[0]?.url).toBe('https://example.com/');
    expect(config.downloadDir).toBe('./downloads');
  });

  it('applies default values', () => {
    const minimalConfig = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(minimalConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.defaults.whitelist).toEqual([]);
    expect(config.defaults.blacklist).toEqual([]);
    expect(config.defaults.tableId).toBe('list');
    expect(config.concurrency).toBe(1);
    expect(config.retries).toBe(2);
    expect(config.requestTimeoutMs).toBe(30000);
    expect(config.logLevel).toBe('info');
  });

  it('resolves system config with defaults', () => {
    const configWithDefaults = {
      downloadDir: './downloads',
      defaults: {
        tableId: 'custom-table',
        whitelist: ['USA'],
        blacklist: ['Demo'],
      },
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(configWithDefaults));

    const config = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(config.systems[0]!, config);

    expect(resolved.tableId).toBe('custom-table');
    expect(resolved.whitelist).toEqual(['USA']);
    expect(resolved.blacklist).toEqual(['Demo']);
    expect(resolved.name).toBe('Nintendo - Game Boy Color');
    expect(resolved.systemId).toBe(10);
    // folder defaults to system shortcode
    expect(resolved.downloadDir).toBe(join('./downloads', 'gbc'));
  });

  it('allows system to override defaults', () => {
    const configWithOverrides = {
      downloadDir: './downloads',
      defaults: {
        tableId: 'default-table',
        whitelist: ['USA'],
        blacklist: ['Demo'],
      },
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
          tableId: 'override-table',
          whitelist: ['Japan'],
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(configWithOverrides));

    const config = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(config.systems[0]!, config);

    expect(resolved.tableId).toBe('override-table');
    expect(resolved.whitelist).toEqual(['Japan']);
    expect(resolved.blacklist).toEqual(['Demo']); // Not overridden
  });

  it('folder defaults to system shortcode', () => {
    const config = {
      downloadDir: '/home/user/roms',
      systems: [
        {
          system: 'snes',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config));

    const loaded = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(loaded.systems[0]!, loaded);

    // No folder specified, should default to system shortcode
    expect(resolved.downloadDir).toBe(join('/home/user/roms', 'snes'));
    expect(resolved.name).toBe('Nintendo - SNES');
    expect(resolved.systemId).toBe(4);
  });

  it('allows explicit folder override', () => {
    const config = {
      downloadDir: '/home/user/roms',
      systems: [
        {
          system: 'snes',
          url: 'https://example.com/',
          folder: 'Super Nintendo',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config));

    const loaded = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(loaded.systems[0]!, loaded);

    // Explicit folder should be used
    expect(resolved.downloadDir).toBe(join('/home/user/roms', 'Super Nintendo'));
  });

  it('supports custom systems', () => {
    const configWithCustom = {
      downloadDir: './downloads',
      customSystems: {
        mygame: {
          name: 'My Custom System',
          systemId: 999,
          extensions: ['.rom'],
        },
      },
      systems: [
        {
          system: 'mygame',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(configWithCustom));

    const config = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(config.systems[0]!, config);

    expect(resolved.name).toBe('My Custom System');
    expect(resolved.systemId).toBe(999);
    // folder defaults to custom system shortcode
    expect(resolved.downloadDir).toBe(join('./downloads', 'mygame'));
  });

  it('custom systems can override built-in', () => {
    const configWithOverride = {
      downloadDir: './downloads',
      customSystems: {
        gbc: {
          name: 'My Custom GBC',
          systemId: 1000,
        },
      },
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(configWithOverride));

    const config = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(config.systems[0]!, config);

    expect(resolved.name).toBe('My Custom GBC');
    expect(resolved.systemId).toBe(1000);
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
      // missing downloadDir and systems array
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on invalid URL format in system', () => {
    const invalidConfig = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'gbc',
          url: 'not-a-valid-url',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on empty systems array', () => {
    const invalidConfig = {
      downloadDir: './downloads',
      systems: [],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on concurrency out of range', () => {
    const invalidConfig = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
      ],
      concurrency: 100,
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    expect(() => loadConfig(TEST_CONFIG_PATH)).toThrow('Config validation failed');
  });

  it('throws on unknown system shortcode', () => {
    const invalidConfig = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'nonexistent-system',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(invalidConfig));

    const config = loadConfig(TEST_CONFIG_PATH);
    expect(() => resolveSystemConfig(config.systems[0]!, config)).toThrow(
      'Unknown system shortcode'
    );
  });

  it('accepts all valid log levels', () => {
    for (const logLevel of ['debug', 'info', 'silent']) {
      const config = {
        downloadDir: './downloads',
        systems: [
          {
            system: 'gbc',
            url: 'https://example.com/',
          },
        ],
        logLevel,
      };
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config));

      const loaded = loadConfig(TEST_CONFIG_PATH);
      expect(loaded.logLevel).toBe(logLevel);
    }
  });

  it('loads full config with all options', () => {
    const fullConfig = {
      downloadDir: '/tmp/downloads',
      defaults: {
        tableId: 'files',
        whitelist: ['mario', 'zelda'],
        blacklist: ['demo'],
      },
      systems: [
        {
          system: 'gbc',
          url: 'https://example.com/',
        },
        {
          system: 'snes',
          url: 'https://other.com/',
          folder: 'Super Nintendo', // explicit folder
          tableId: 'custom',
        },
      ],
      concurrency: 4,
      userAgent: 'TestAgent/1.0',
      requestTimeoutMs: 60000,
      retries: 5,
      logLevel: 'debug',
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(fullConfig));

    const config = loadConfig(TEST_CONFIG_PATH);

    expect(config.systems).toHaveLength(2);
    expect(config.concurrency).toBe(4);
    expect(config.userAgent).toBe('TestAgent/1.0');
    expect(config.requestTimeoutMs).toBe(60000);
    expect(config.retries).toBe(5);
    expect(config.logLevel).toBe('debug');
  });

  it('supports system aliases (sfc = snes)', () => {
    const config = {
      downloadDir: './downloads',
      systems: [
        {
          system: 'sfc',
          url: 'https://example.com/',
        },
      ],
    };
    writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config));

    const loaded = loadConfig(TEST_CONFIG_PATH);
    const resolved = resolveSystemConfig(loaded.systems[0]!, loaded);

    // sfc is an alias for snes, should resolve to same system
    expect(resolved.name).toBe('Nintendo - SNES');
    expect(resolved.systemId).toBe(4);
    // folder defaults to the shortcode used (sfc), not the canonical name
    expect(resolved.downloadDir).toBe(join('./downloads', 'sfc'));
  });
});
