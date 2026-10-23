import type { TileSpec, TileTone } from '@src/engine/types';
import type { GameConfig } from '@src/protocol/schema';

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

/** A button on the action row at the bottom; `id` is the action it fires. */
export interface HudAction {
  id: string;
  label: string;
  tone: TileTone;
  /** The main action of the screen: a solid piece. Others are soft (or neutral in stone). */
  primary?: boolean;
  disabled?: boolean;
  /** Trailing symbol, like ↵ on the submit buttons. */
  glyph?: string;
}

/** A time left, with how much of its whole span remains (for the meter). */
export interface HudTime {
  seconds: number;
  /** 0..1 */
  fraction: number;
  urgent?: boolean;
}

export interface HudPlayer {
  id: string;
  name: string;
  tone: TileTone;
  score: number;
  /** Whose turn it is; their chip is solid and carries the turn clock. */
  active?: boolean;
  turn?: HudTime;
}

/**
 * What the HUD shows, as meaning rather than style: the shell turns it into
 * DOM pieces around the board. Actions fire the same ids as tile actions.
 */
export interface Hud {
  title?: string;
  /** A copy button after the title; `copied` while the confirmation shows. */
  copy?: { copied: boolean };
  /** Action of the back button. */
  back?: string;
  settings?: boolean;
  logo?: boolean;
  clock?: HudTime;
  players?: HudPlayer[];
  actions: HudAction[];
  toast?: { text: string; tone: TileTone };
  /** The settings drawer over the screen. */
  drawer?: { config: GameConfig; editable: boolean };
  /** Little room (keyboard open): clock and players share one row. */
  compact: boolean;
}

/** What a screen puts on the board and around it. */
export interface Scene {
  tiles: TileSpec[];
  fields: Field[];
  hud: Hud;
}
