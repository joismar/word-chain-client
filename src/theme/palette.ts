import type { TileTone } from '@src/engine/types';
import type { PlayerColor } from '@src/protocol/schema';
import { clampChroma, toHex, type Oklch } from './oklch';

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

/** Lightness of the strip at the bottom of a tile, relative to its face. */
export const TILE_SHADOW_DELTA = -0.12;

/** A shade of `color`, losing only the chroma sRGB can't show that dark. */
const darker = (color: Oklch, delta: number) => clampChroma({ ...color, l: color.l + delta });

/** Letter colour on a face: near white, tinted no more than the face is. */
const textOn = (face: Oklch): Oklch => clampChroma({ ...TEXT, c: Math.min(TEXT.c, face.c), h: face.h });

/** A tile's face, letter and bottom strip in OKLCH (the DOM logo draws tiles too). */
export function tileColors(tone: TileTone): { face: Oklch; text: Oklch; shadow: Oklch } {
  const face = TONE_COLORS[tone];
  return { face, text: textOn(face), shadow: darker(face, TILE_SHADOW_DELTA) };
}

export const TONES = Object.fromEntries(
  (Object.keys(TONE_COLORS) as TileTone[]).map((tone) => {
    const { face, text, shadow } = tileColors(tone);
    return [tone, { face: toHex(face), text: toHex(text), shadow: toHex(shadow) }];
  }),
) as Record<TileTone, { face: number; text: number; shadow: number }>;

/** Opacity of a face colour on an empty input slot. */
export const SLOT_ALPHA = 0.22;
/** The same, on a field that can't take input yet (someone else's turn). */
export const SLOT_DISABLED_ALPHA = 0.14;

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

/**
 * HUD pieces share the tiles' material: `solid` is a tile face, `neutral` a
 * dark grey piece, `soft` a dark piece tinted by its tone, `disabled` sunk
 * and dimmed.
 */
export type PieceVariant = 'solid' | 'neutral' | 'soft' | 'disabled';

export const HUD_COLORS = {
  ink: { l: 0.93, c: 0.01, h: 60 },
  muted: { l: 0.72, c: 0.01, h: 60 },
  neutral: { l: 0.355, c: 0.012, h: 60 },
  disabled: { l: 0.3, c: 0.008, h: 60 },
  disabledText: { l: 0.55, c: 0.01, h: 60 },
  drawerSurface: { l: 0.235, c: 0.008, h: 40 },
  drawerDivider: { l: 0.3, c: 0.008, h: 40 },
  drawerHandle: { l: 0.42, c: 0.01, h: 40 },
  scrim: { l: 0.12, c: 0.005, h: 34 },
} satisfies Record<string, Oklch>;

/** A soft piece: dark face, its tone's hue in the face and the letters. */
export const SOFT = { face: { l: 0.355, c: 0.03 }, text: { l: 0.82, c: 0.1 } };
/** Lightness of a HUD piece's shadow, relative to its face. */
export const HUD_SHADOW_DELTA = -0.15;
export const SCRIM_ALPHA = 0.6;
/** Opacity of the time meter under the clock and the active chip. */
export const METER_ALPHA = 0.45;
/** The initial in the active player's chip: inverted, a light tile with a dark letter. */
export const ACTIVE_MINI = { face: { l: 0.96, c: 0.02 }, text: { l: 0.45, c: FACE.c } };

export interface PieceColors {
  face: Oklch;
  text: Oklch;
  shadow: Oklch;
}

export function pieceColors(variant: PieceVariant, tone: TileTone = 'stone'): PieceColors {
  const base = TONE_COLORS[tone];
  const face = variant === 'solid' ? base
    : variant === 'soft' ? { ...SOFT.face, c: Math.min(SOFT.face.c, base.c), h: base.h }
      : variant === 'disabled' ? HUD_COLORS.disabled
        : HUD_COLORS.neutral;
  const text = variant === 'solid' ? textOn(base)
    : variant === 'soft' ? { ...SOFT.text, c: Math.min(SOFT.text.c, base.c), h: base.h }
      : variant === 'disabled' ? HUD_COLORS.disabledText
        : HUD_COLORS.ink;
  return { face, text, shadow: darker(face, HUD_SHADOW_DELTA) };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** CSS `oklch()` for a palette colour. */
export function css({ l, c, h }: Oklch, alpha?: number): string {
  return `oklch(${round(l)} ${round(c)} ${round(h)}${alpha === undefined ? '' : ` / ${alpha}`})`;
}

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
