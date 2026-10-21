/** Colour family of a tile; the palette maps each to concrete colours. */
export type TileTone = 'stone' | 'amber' | 'emerald' | 'sky' | 'purple' | 'rose';

/**
 * One letter cell on the board. Scenes return a list of these; the engine
 * diffs them by `key` so a tile that keeps its key moves instead of popping.
 */
export interface TileSpec {
  /** Stable identity across renders, unique within a scene. */
  key: string;
  char: string;
  /** Board coordinates, (0,0) is the centre cell. */
  row: number;
  col: number;
  tone?: TileTone;
  /** `slot` is an empty input cell; `active` marks where the next letter goes. */
  variant?: 'solid' | 'slot';
  active?: boolean;
  /** Tiles with an action are clickable; tiles sharing it act as one button. */
  action?: string;
}

export type EngineEvent =
  | { type: 'tap'; action: string; key: string }
  | { type: 'hover'; action: string | null; key: string | null };
