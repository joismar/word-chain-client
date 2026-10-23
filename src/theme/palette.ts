import type { TileTone } from '@src/engine/types';
import type { PlayerColor } from '@src/protocol/schema';
import { toHex, type Oklch } from './oklch';

/**
 * Every tile face shares one OKLCH lightness and chroma, so no player's
 * colour reads louder than another's and the letters keep the same contrast
 * on all of them. Only the hue changes.
 */
export const FACE = { l: 0.53, c: 0.105 };
export const TEXT = { l: 0.97, c: 0.025 };

export const TONE_COLORS: Record<TileTone, Oklch> = {
  stone: { ...FACE, c: 0.012, h: 60 },
  brown: { ...FACE, c: 0.06, h: 55 },
  amber: { ...FACE, h: 75 },
  orange: { ...FACE, h: 48 },
  rose: { ...FACE, h: 18 },
  pink: { ...FACE, h: 350 },
  purple: { ...FACE, h: 305 },
  sky: { ...FACE, h: 240 },
  emerald: { ...FACE, h: 160 },
};

export const TONES = Object.fromEntries(
  Object.entries(TONE_COLORS).map(([tone, face]) => [tone, {
    face: toHex(face),
    text: toHex({ ...TEXT, c: Math.min(TEXT.c, face.c), h: face.h }),
  }]),
) as Record<TileTone, { face: number; text: number }>;

/** Opacity of a face colour on an empty input slot. */
export const SLOT_ALPHA = 0.22;

/** The board behind the tiles; `background` matches `:root` in index.css. */
export const BOARD_COLORS = {
  background: { l: 0.268, c: 0.007, h: 34.3 },
  emptyCell: { l: 0.228, c: 0.006, h: 34.3 },
  cursor: { l: 0.82, c: 0.01, h: 60 },
} satisfies Record<string, Oklch>;

export const BOARD = {
  background: toHex(BOARD_COLORS.background),
  emptyCell: toHex(BOARD_COLORS.emptyCell),
  cursor: toHex(BOARD_COLORS.cursor),
};

const PLAYER_TONES: Record<PlayerColor, TileTone> = {
  red: 'rose',
  blue: 'sky',
  green: 'emerald',
  yellow: 'amber',
  orange: 'orange',
  purple: 'purple',
  pink: 'pink',
  brown: 'brown',
};

/** Tile tone for a player's colour. */
export function playerTone(color: PlayerColor | null | undefined): TileTone {
  return color ? PLAYER_TONES[color] : 'stone';
}
