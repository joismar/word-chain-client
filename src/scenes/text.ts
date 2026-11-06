import { inputTiles, wordTiles } from '@src/engine/join';
import type { TileSpec } from '@src/engine/types';
import { toBoardText } from '@src/lib/sanitize';
import { board as boardTokens } from '@src/theme/tokens';
import type { Area, Field } from './types';

type Extra = Omit<TileSpec, 'key' | 'char' | 'row' | 'col'>;

/** Free text (names, words from the server) as tiles, in the font's alphabet. */
export function text(id: string, value: string, row: number, col: number, extra: Extra = {}): TileSpec[] {
  return wordTiles(id, toBoardText(value), row, col, extra);
}

/** First column (or row) that centres `length` cells on 0. */
export const centred = (length: number) => -Math.floor(length / 2);

/** A field's tiles: typed letters on solid tiles, the rest as slots. */
export function fieldTiles(id: string, field: Field, focused: boolean, extra: Extra = {}): TileSpec[] {
  return inputTiles(id, field.value, field.row, field.col, field.length, focused, extra);
}

/** Little vertical room (a phone with the keyboard open): the HUD packs into one row. */
export const isCompact = (area: Area) => area.rows < boardTokens.compactRows;

/** Drops tiles that fall outside the board. */
export function clip(tiles: TileSpec[], area: Area): TileSpec[] {
  const rowSpan = (area.rows - 1) / 2;
  const colSpan = (area.cols - 1) / 2;
  return tiles.filter((t) => Math.abs(t.row) <= rowSpan && Math.abs(t.col) <= colSpan);
}
