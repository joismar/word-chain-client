import { describe, expect, it } from 'vitest';
import { inputTiles, joinTiles, wordTiles } from './join';
import type { TileSpec } from './types';

const tile = (key: string, char = 'A', col = 0): TileSpec => ({ key, char, row: 0, col });

describe('joinTiles', () => {
  it('splits the next specs into enter, update and exit by key', () => {
    const prev = new Map([['a', tile('a')], ['b', tile('b')]]);
    const next = [tile('b', 'B', 1), tile('c')];
    const { enter, update, exit } = joinTiles(prev, next);
    expect(enter.map((t) => t.key)).toEqual(['c']);
    expect(update.map((t) => t.key)).toEqual(['b']);
    expect(exit).toEqual(['a']);
  });

  it('skips unchanged tiles', () => {
    const prev = new Map([['a', tile('a')]]);
    expect(joinTiles(prev, [tile('a')]).update).toEqual([]);
  });

  it('rejects duplicate keys', () => {
    expect(() => joinTiles(new Map(), [tile('a'), tile('a')])).toThrow(/duplicate tile key "a"/);
  });
});

describe('wordTiles', () => {
  it('lays a word out left to right with stable per-letter keys', () => {
    const tiles = wordTiles('menu', 'OLA', -1, -2, { tone: 'amber', action: 'host' });
    expect(tiles).toEqual([
      { key: 'menu:0', char: 'O', row: -1, col: -2, tone: 'amber', action: 'host' },
      { key: 'menu:1', char: 'L', row: -1, col: -1, tone: 'amber', action: 'host' },
      { key: 'menu:2', char: 'A', row: -1, col: 0, tone: 'amber', action: 'host' },
    ]);
  });

  it('skips spaces but keeps the column', () => {
    expect(wordTiles('w', 'A B', 0, 0).map((t) => [t.key, t.col])).toEqual([['w:0', 0], ['w:2', 2]]);
  });
});

describe('inputTiles', () => {
  it('shows typed letters, empty slots and the caret where the next letter goes', () => {
    const tiles = inputTiles('name', 'AB', 2, 0, 4, true);
    expect(tiles.map((t) => [t.key, t.char, t.col, t.variant, t.active ?? false])).toEqual([
      ['name:0', 'A', 0, 'solid', false],
      ['name:1', 'B', 1, 'solid', false],
      ['name:2', ' ', 2, 'slot', true],
      ['name:3', ' ', 3, 'slot', false],
    ]);
  });

  it('hides the caret when unfocused or full', () => {
    expect(inputTiles('n', 'A', 0, 0, 2, false).some((t) => t.active)).toBe(false);
    expect(inputTiles('n', 'AB', 0, 0, 2, true).some((t) => t.active)).toBe(false);
  });
});
