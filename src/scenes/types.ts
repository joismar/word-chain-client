import type { TileSpec } from '@src/engine/types';

/** The board size a scene lays out on, in cells (both odd, centred on 0,0). */
export interface Area {
  rows: number;
  cols: number;
}

export type FieldId = 'player' | 'room' | 'word';

/** A text field drawn as tiles; the shell lays a real <input> over its cells. */
export interface Field {
  id: FieldId;
  row: number;
  col: number;
  length: number;
  /** Accessible name of the input (pt-BR). */
  label: string;
  value: string;
}

/** What a screen puts on the board. */
export interface Scene {
  tiles: TileSpec[];
  fields: Field[];
}
