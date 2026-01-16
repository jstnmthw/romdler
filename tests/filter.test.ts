import { describe, it, expect } from 'vitest';
import {
  parseFilterExpression,
  matchesExpression,
  applyFilters,
  createFilterFn,
} from '../src/filter/index.js';

describe('parseFilterExpression', () => {
  it('returns empty array for empty input', () => {
    expect(parseFilterExpression([])).toEqual([]);
  });

  it('parses single term', () => {
    expect(parseFilterExpression(['foo'])).toEqual([['foo']]);
  });

  it('parses multiple OR terms', () => {
    expect(parseFilterExpression(['foo', 'bar'])).toEqual([['foo'], ['bar']]);
  });

  it('parses AND expression', () => {
    expect(parseFilterExpression(['foo AND bar'])).toEqual([['foo', 'bar']]);
  });

  it('parses mixed AND/OR expressions', () => {
    expect(parseFilterExpression(['foo AND bar', 'baz'])).toEqual([
      ['foo', 'bar'],
      ['baz'],
    ]);
  });

  it('handles case-insensitive AND keyword', () => {
    expect(parseFilterExpression(['foo and bar'])).toEqual([['foo', 'bar']]);
    expect(parseFilterExpression(['foo AND bar'])).toEqual([['foo', 'bar']]);
  });

  it('trims whitespace', () => {
    expect(parseFilterExpression(['  foo  ', '  bar  '])).toEqual([['foo'], ['bar']]);
  });

  it('lowercases all terms', () => {
    expect(parseFilterExpression(['FOO', 'Bar'])).toEqual([['foo'], ['bar']]);
  });

  it('filters out empty strings', () => {
    expect(parseFilterExpression(['', '  ', 'foo'])).toEqual([['foo']]);
  });
});

describe('matchesExpression', () => {
  it('returns false for empty expression', () => {
    expect(matchesExpression('test', [])).toBe(false);
  });

  it('matches single term', () => {
    const expr = parseFilterExpression(['foo']);
    expect(matchesExpression('foobar', expr)).toBe(true);
    expect(matchesExpression('bazfoo', expr)).toBe(true);
    expect(matchesExpression('bar', expr)).toBe(false);
  });

  it('matches OR - any term matches', () => {
    const expr = parseFilterExpression(['foo', 'bar']);
    expect(matchesExpression('foobar', expr)).toBe(true);
    expect(matchesExpression('bar only', expr)).toBe(true);
    expect(matchesExpression('baz', expr)).toBe(false);
  });

  it('matches AND - all terms must match', () => {
    const expr = parseFilterExpression(['foo AND bar']);
    expect(matchesExpression('foobar', expr)).toBe(true);
    expect(matchesExpression('bar foo baz', expr)).toBe(true);
    expect(matchesExpression('foo only', expr)).toBe(false);
    expect(matchesExpression('bar only', expr)).toBe(false);
  });

  it('matches case-insensitively', () => {
    const expr = parseFilterExpression(['FOO']);
    expect(matchesExpression('foo', expr)).toBe(true);
    expect(matchesExpression('FOO', expr)).toBe(true);
    expect(matchesExpression('FoO', expr)).toBe(true);
  });

  it('matches complex expression: (foo AND bar) OR baz', () => {
    const expr = parseFilterExpression(['foo AND bar', 'baz']);
    expect(matchesExpression('foobar', expr)).toBe(true);    // matches foo AND bar
    expect(matchesExpression('bazqux', expr)).toBe(true);    // matches baz
    expect(matchesExpression('foo', expr)).toBe(false);       // foo alone doesn't match
    expect(matchesExpression('bar', expr)).toBe(false);       // bar alone doesn't match
    expect(matchesExpression('qux', expr)).toBe(false);       // no match
  });
});

describe('applyFilters', () => {
  const items = [
    { filename: 'mario.zip', linkText: 'Super Mario World' },
    { filename: 'zelda.zip', linkText: 'Legend of Zelda' },
    { filename: 'tetris.zip', linkText: 'Tetris' },
    { filename: 'sonic.zip', linkText: 'Sonic the Hedgehog' },
  ];

  it('returns all items when both lists are empty', () => {
    const result = applyFilters(items, { whitelist: [], blacklist: [] });
    expect(result).toEqual(items);
  });

  it('filters by whitelist', () => {
    const result = applyFilters(items, {
      whitelist: ['mario'],
      blacklist: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('mario.zip');
  });

  it('filters by whitelist with OR', () => {
    const result = applyFilters(items, {
      whitelist: ['mario', 'zelda'],
      blacklist: [],
    });
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.filename)).toContain('mario.zip');
    expect(result.map((r) => r.filename)).toContain('zelda.zip');
  });

  it('excludes by blacklist', () => {
    const result = applyFilters(items, {
      whitelist: [],
      blacklist: ['sonic'],
    });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.filename)).not.toContain('sonic.zip');
  });

  it('blacklist takes precedence over whitelist', () => {
    const result = applyFilters(items, {
      whitelist: ['mario', 'sonic'],
      blacklist: ['sonic'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('mario.zip');
  });

  it('matches against linkText as well', () => {
    const result = applyFilters(items, {
      whitelist: ['hedgehog'],
      blacklist: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('sonic.zip');
  });

  it('matches against combined filename and linkText', () => {
    const result = applyFilters(items, {
      whitelist: ['sonic AND hedgehog'],
      blacklist: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('sonic.zip');
  });
});

describe('createFilterFn', () => {
  it('creates a reusable filter function', () => {
    const filterFn = createFilterFn({ whitelist: ['mario'], blacklist: [] });

    expect(filterFn({ filename: 'mario.zip', linkText: 'Mario' })).toBe(true);
    expect(filterFn({ filename: 'zelda.zip', linkText: 'Zelda' })).toBe(false);
  });

  it('filter function respects blacklist', () => {
    const filterFn = createFilterFn({ whitelist: [], blacklist: ['demo'] });

    expect(filterFn({ filename: 'game.zip', linkText: 'Game' })).toBe(true);
    expect(filterFn({ filename: 'demo.zip', linkText: 'Demo Version' })).toBe(false);
  });

  it('filter function allows all when lists are empty', () => {
    const filterFn = createFilterFn({ whitelist: [], blacklist: [] });

    expect(filterFn({ filename: 'anything.zip', linkText: 'Anything' })).toBe(true);
  });

  it('filter function handles AND expressions', () => {
    const filterFn = createFilterFn({
      whitelist: ['super AND mario'],
      blacklist: [],
    });

    expect(filterFn({ filename: 'super_mario.zip', linkText: 'Super Mario' })).toBe(true);
    expect(filterFn({ filename: 'super.zip', linkText: 'Super Game' })).toBe(false);
    expect(filterFn({ filename: 'mario.zip', linkText: 'Mario Bros' })).toBe(false);
  });

  it('filter function blacklist overrides whitelist', () => {
    const filterFn = createFilterFn({
      whitelist: ['game'],
      blacklist: ['demo'],
    });

    expect(filterFn({ filename: 'game.zip', linkText: 'Full Game' })).toBe(true);
    expect(filterFn({ filename: 'game_demo.zip', linkText: 'Game Demo' })).toBe(false);
  });
});
